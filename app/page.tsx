"use client";

import { useMemo, useState } from "react";
import { AddMaterialsModal } from "@/components/add-materials-modal";
import { BackgroundVideo } from "@/components/background-video";
import { ChatPanel, type UiMessage } from "@/components/chat-panel";
import { LogMenu } from "@/components/log-menu";
import { SourceReader } from "@/components/source-reader";
import { SourceSidebar } from "@/components/source-sidebar";
import { Toast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { WorkflowPanel } from "@/components/workflow-panel";
import { askLabGuide, generateWorkflow, ingestFiles, ingestRepository } from "@/lib/client/api";
import { checkLabScope, outOfScopeResponse } from "@/lib/chat/scope";
import { appendSessionEvent, setSessionLogContext } from "@/lib/logging/session-log";
import { summarizeSourceMeta, truncateText } from "@/lib/logging/redact";
import type { Citation, LabProgress, LabWorkflow, SourceDocument } from "@/lib/shared/types";
import { completeAndAdvance, createChatWorkflowContext, initialProgress, moveToStep, normalizeProgress, progressStorageKey } from "@/lib/workflow/progress";

type Panel = "sources" | "chat";
type ReaderTarget = { sourceId: string; section?: string; excerpt?: string };

function readStoredProgress(sources: SourceDocument[], workflow: LabWorkflow, repository?: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(progressStorageKey(sources, repository)) || "{}") as Partial<LabProgress>;
    return normalizeProgress(workflow, value);
  } catch {
    return initialProgress(workflow);
  }
}

export default function Home() {
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [repository, setRepository] = useState<string>();
  const [workflow, setWorkflow] = useState<LabWorkflow | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [readerTarget, setReaderTarget] = useState<ReaderTarget | null>(null);
  const [progress, setProgress] = useState<LabProgress>({ currentStepId: null, completedStepIds: [], stepHistory: [] });
  const [selectedStepId, setSelectedStepId] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [panel, setPanel] = useState<Panel>("chat");
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const currentStep = useMemo(() => workflow?.steps.find((step) => step.id === progress.currentStepId), [workflow, progress.currentStepId]);
  const readerSource = sources.find((source) => source.id === readerTarget?.sourceId);
  const labTitle = workflow?.title || repository?.replace("https://github.com/", "") || sources[0]?.name;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function persist(nextProgress: LabProgress, activeSources = sources, activeRepository = repository) {
    if (activeSources.length) window.localStorage.setItem(progressStorageKey(activeSources, activeRepository), JSON.stringify(nextProgress));
  }

  async function runWorkflow(nextSources: SourceDocument[], nextRepository = repository) {
    setWorkflowLoading(true);
    setWorkflowError("");
    const startedAt = Date.now();
    appendSessionEvent("workflow_generation_started", { sourceCount: nextSources.length, sourceIds: nextSources.map((source) => source.id) });
    try {
      const result = await generateWorkflow(nextSources);
      const saved = readStoredProgress(nextSources, result.workflow, nextRepository);
      setWorkflow(result.workflow);
      setProgress(saved);
      persist(saved, nextSources, nextRepository);
      setSelectedStepId(saved.currentStepId || "");
      appendSessionEvent("workflow_generation_completed", {
        title: result.workflow.title,
        generationMode: result.generationMode || "ai",
        fallbackReason: result.fallbackReason || null,
        stepCount: result.workflow.steps.length,
        steps: result.workflow.steps.map((step) => ({
          id: step.id,
          order: step.order,
          title: step.title,
          requirements: step.requirements,
          whatToDo: step.whatToDo,
          howToDoIt: step.howToDoIt,
          successCriteria: step.successCriteria,
          sources: step.sources.map((citation) => ({ sourceId: citation.sourceId, file: citation.file, section: citation.section }))
        })),
        durationMs: Date.now() - startedAt
      });
      setMessages((current) => current.length ? current : [{ id: "welcome", role: "assistant", content: `I’ve extracted **${result.workflow.steps.length} workflow steps**. Ask what to do next or open the workflow checklist.` }]);
      if (result.generationMode === "fallback") {
        notify("Generated from repository structure because AI generation was unavailable.");
      } else {
        notify("Workflow ready");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow generation failed.";
      appendSessionEvent("workflow_generation_failed", { error: message, durationMs: Date.now() - startedAt });
      setWorkflowError(message);
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function buildWorkspace(nextSources: SourceDocument[], nextRepository?: string, ingest?: { discovered: number; failed: Array<{ path: string }> }) {
    const repoId = nextRepository ? nextRepository.replace("https://github.com/", "") : "local-files";
    setSessionLogContext({ repoId });
    appendSessionEvent("source_ingest_completed", {
      repository: nextRepository ?? null,
      fileCount: nextSources.length,
      files: nextSources.map((source) => summarizeSourceMeta(source)),
      failedSources: ingest?.failed || []
    });
    setSources(nextSources);
    setRepository(nextRepository);
    setSelectedSourceId(nextSources[0]?.id || "");
    setWorkflow(null);
    setWorkflowError("");
    setProgress({ currentStepId: null, completedStepIds: [], stepHistory: [] });
    setSelectedStepId("");
    setMessages([]);
    setChatError("");
    setModalOpen(false);
    setReaderTarget(null);
    if (ingest && (ingest.discovered > nextSources.length || ingest.failed.length)) {
      const failedNames = ingest.failed.slice(0, 2).map((entry) => entry.path).join(", ");
      notify(`${nextSources.length} of ${ingest.discovered} documentation files indexed.${failedNames ? ` Could not read: ${failedNames}` : ""}`);
    } else {
      notify("Sources ready — chat is available");
    }
    void runWorkflow(nextSources, nextRepository);
  }

  async function addRepository(url: string) {
    setSessionLogContext({ repoId: url.replace("https://github.com/", "") });
    appendSessionEvent("source_ingest_started", { inputKind: "repository", repositoryUrl: url });
    const result = await ingestRepository(url);
    await buildWorkspace(result.sources, result.repository, { discovered: result.sources.length + result.failedSources.length, failed: result.failedSources });
  }
  async function addFiles(files: File[], paths?: string[]) {
    setSessionLogContext({ repoId: "local-files" });
    appendSessionEvent("source_ingest_started", { inputKind: "files", fileCount: files.length, fileNames: files.map((file) => file.name) });
    const result = await ingestFiles(files, paths);
    await buildWorkspace(result.sources, undefined, { discovered: files.length, failed: result.failedSources || [] });
  }
  async function addPaste(name: string, content: string) { const safeName = /\.(md|mdx|txt)$/i.test(name) ? name : `${name || "notes"}.md`; await addFiles([new File([content], safeName, { type: "text/markdown" })]); }

  async function sendMessage(question: string) {
    if (!sources.length || thinking) return;
    const user: UiMessage = { id: `user-${Date.now()}`, role: "user", content: question };
    setMessages((current) => [...current, user]);
    // Lab-scope guard first: unrelated questions get a local refusal, no provider call.
    const scopeSteps = workflow ? [workflow.steps.find((step) => step.id === progress.currentStepId)].filter((step): step is NonNullable<typeof step> => Boolean(step)) : [];
    const scope = checkLabScope(question, {
      labTitle,
      fileNames: sources.map((source) => source.name),
      headings: sources.flatMap((source) => source.headings),
      stepTitles: scopeSteps.map((step) => step.title)
    });
    if (!scope.inScope) {
      const refusal = outOfScopeResponse(question);
      appendSessionEvent("chat_request_completed", {
        question: truncateText(question, 2000),
        answer: refusal,
        citations: [],
        currentStepId: progress.currentStepId,
        scope: "out-of-scope",
        scopeReason: scope.reason,
        servedLocally: true,
        durationMs: 0
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: refusal }]);
      return;
    }
    setThinking(true);
    setChatError("");
    const startedAt = Date.now();
    const questionSnapshot = question;
    const currentStepSnapshot = progress.currentStepId;
    const selectedStepSnapshot = selectedStepId || null;
    appendSessionEvent("chat_request_started", {
      question: truncateText(questionSnapshot, 2000),
      currentStepId: currentStepSnapshot,
      selectedStepId: selectedStepSnapshot,
      sourceIds: sources.map((source) => source.id)
    });
    try {
      const answer = await askLabGuide({
        question,
        sources,
        progress: workflow ? progress : undefined,
        workflowContext: workflow ? createChatWorkflowContext(workflow, progress) : undefined,
        history: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
        selectedStepId: selectedStepId || undefined,
        labTitle: labTitle || undefined
      });
      appendSessionEvent("chat_request_completed", {
        question: truncateText(questionSnapshot, 2000),
        answer: truncateText(answer.answer, 8000),
        citations: answer.citations.map((citation) => ({ sourceId: citation.sourceId, file: citation.file, section: citation.section })),
        currentStepId: currentStepSnapshot,
        durationMs: Date.now() - startedAt
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: answer.answer, citations: answer.citations }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat request failed.";
      appendSessionEvent("chat_request_failed", { question: truncateText(questionSnapshot, 2000), currentStepId: currentStepSnapshot, error: message, durationMs: Date.now() - startedAt });
      setChatError(message);
    } finally {
      setThinking(false);
    }
  }

  function selectSource(id: string) { setSelectedSourceId(id); }
  function openSource(id: string) { selectSource(id); setReaderTarget({ sourceId: id }); }
  function openCitation(citation: Citation) {
    selectSource(citation.sourceId);
    setReaderTarget({ sourceId: citation.sourceId, section: citation.section, excerpt: citation.excerpt });
    notify("Citation source opened");
    if (window.matchMedia("(max-width: 1050px)").matches) setPanel("sources");
  }

  function selectStep(id: string, method: "click" | "previous" | "next" | "return" = "click") {
    const step = workflow?.steps.find((item) => item.id === id);
    if (!step) return;
    setSelectedStepId(id);
    appendSessionEvent("workflow_step_selected", { stepId: id, order: step.order, title: step.title, method });
  }

  function completeCurrent() {
    if (!currentStep || !workflow) return;
    const next = completeAndAdvance(workflow, progress);
    setProgress(next);
    persist(next);
    setSelectedStepId(next.currentStepId || "");
    appendSessionEvent("workflow_step_completed", { stepId: currentStep.id, order: currentStep.order, title: currentStep.title, nextStepId: next.currentStepId });
    notify(`Step ${currentStep.order} completed`);
  }

  function moveSelected(offset: -1 | 1) {
    if (!workflow) return;
    const anchor = selectedStepId || progress.currentStepId;
    const index = workflow.steps.findIndex((step) => step.id === anchor);
    const target = workflow.steps[index + offset];
    if (!target) return;
    selectStep(target.id, offset < 0 ? "previous" : "next");
  }

  function setCurrentStep(id: string) {
    if (!workflow?.steps.some((step) => step.id === id)) return;
    const previousCurrentStepId = progress.currentStepId;
    const next = moveToStep(progress, id);
    setProgress(next);
    persist(next);
    setSelectedStepId(id);
    appendSessionEvent("workflow_step_set_current", { stepId: id, previousCurrentStepId });
    notify("Current step updated");
  }

  return (
    <main className="app-shell">
      <BackgroundVideo />
      <TopBar title={labTitle} completed={progress.completedStepIds.length} total={workflow?.steps.length || 0} actions={<LogMenu />} />
      <nav className="panel-tabs" aria-label="Workspace panels">{(["sources", "chat"] as Panel[]).map((item) => <button type="button" key={item} className={panel === item ? "active" : ""} onClick={() => setPanel(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      <div className={`workspace active-${panel} ${workflowOpen ? "workflow-open" : "workflow-closed"}`}>
        <SourceSidebar sources={sources} selectedId={selectedSourceId} repository={repository} onSelect={selectSource} onOpen={openSource} onAdd={() => setModalOpen(true)} />
        <ChatPanel messages={messages} thinking={thinking} error={chatError} disabled={!sources.length} onSend={sendMessage} onCitation={openCitation} onAdd={() => setModalOpen(true)} onDismissError={() => setChatError("")} />
        <WorkflowPanel workflow={workflow} progress={progress} selectedId={selectedStepId} loading={workflowLoading} error={workflowError} hasSources={Boolean(sources.length)} open={workflowOpen} onOpenChange={setWorkflowOpen} onSelect={(id) => selectStep(id)} onOpenCitation={openCitation} onSetCurrent={setCurrentStep} onComplete={completeCurrent} onPrevious={() => moveSelected(-1)} onNext={() => moveSelected(1)} onRetry={() => void runWorkflow(sources, repository)} />
      </div>
      {modalOpen ? <AddMaterialsModal onClose={() => setModalOpen(false)} onRepository={addRepository} onFiles={addFiles} onPaste={addPaste} /> : null}
      {readerSource ? <SourceReader source={readerSource} section={readerTarget?.section} excerpt={readerTarget?.excerpt} onClose={() => setReaderTarget(null)} /> : null}
      <Toast message={toast} />
    </main>
  );
}
