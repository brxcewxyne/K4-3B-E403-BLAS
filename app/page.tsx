"use client";

import { useMemo, useState } from "react";
import { AddMaterialsModal } from "@/components/add-materials-modal";
import { BackgroundVideo } from "@/components/background-video";
import { ChatPanel, type UiMessage } from "@/components/chat-panel";
import { SourceReader } from "@/components/source-reader";
import { SourceSidebar } from "@/components/source-sidebar";
import { Toast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { WorkflowPanel } from "@/components/workflow-panel";
import { askLabGuide, generateWorkflow, ingestFiles, ingestRepository } from "@/lib/client/api";
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
    try {
      const result = await generateWorkflow(nextSources);
      const saved = readStoredProgress(nextSources, result.workflow, nextRepository);
      setWorkflow(result.workflow);
      setProgress(saved);
      persist(saved, nextSources, nextRepository);
      setSelectedStepId(saved.currentStepId || "");
      setMessages((current) => current.length ? current : [{ id: "welcome", role: "assistant", content: `I’ve extracted **${result.workflow.steps.length} workflow steps**. Ask what to do next or open the workflow checklist.` }]);
      notify("Workflow ready");
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Workflow generation failed.");
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function buildWorkspace(nextSources: SourceDocument[], nextRepository?: string) {
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
    notify("Sources ready — chat is available");
    void runWorkflow(nextSources, nextRepository);
  }

  async function addRepository(url: string) { const result = await ingestRepository(url); await buildWorkspace(result.sources, result.repository); }
  async function addFiles(files: File[]) { const result = await ingestFiles(files); await buildWorkspace(result.sources); }
  async function addPaste(name: string, content: string) { const safeName = /\.(md|mdx)$/i.test(name) ? name : `${name || "notes"}.md`; await addFiles([new File([content], safeName, { type: "text/markdown" })]); }

  async function sendMessage(question: string) {
    if (!sources.length || thinking) return;
    const user: UiMessage = { id: `user-${Date.now()}`, role: "user", content: question };
    setMessages((current) => [...current, user]);
    setThinking(true);
    setChatError("");
    try {
      const answer = await askLabGuide({
        question,
        sources,
        progress: workflow ? progress : undefined,
        workflowContext: workflow ? createChatWorkflowContext(workflow, progress) : undefined,
        history: messages.slice(-8).map((message) => ({ role: message.role, content: message.content }))
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: answer.answer, citations: answer.citations }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Chat request failed.");
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

  function completeCurrent() {
    if (!currentStep || !workflow) return;
    const next = completeAndAdvance(workflow, progress);
    setProgress(next);
    persist(next);
    setSelectedStepId(next.currentStepId || "");
    notify(`Step ${currentStep.order} completed`);
  }

  function moveCurrent(offset: -1 | 1) {
    if (!workflow || !currentStep) return;
    const index = workflow.steps.findIndex((step) => step.id === currentStep.id);
    const target = workflow.steps[index + offset];
    if (!target) return;
    const next = moveToStep(progress, target.id);
    setProgress(next);
    persist(next);
    setSelectedStepId(target.id);
    notify(`Current step: ${target.title}`);
  }

  function setCurrentStep(id: string) {
    if (!workflow?.steps.some((step) => step.id === id)) return;
    const next = moveToStep(progress, id);
    setProgress(next);
    persist(next);
    setSelectedStepId(id);
    notify("Current step updated");
  }

  return (
    <main className="app-shell">
      <BackgroundVideo />
      <TopBar title={labTitle} completed={progress.completedStepIds.length} total={workflow?.steps.length || 0} />
      <nav className="panel-tabs" aria-label="Workspace panels">{(["sources", "chat"] as Panel[]).map((item) => <button type="button" key={item} className={panel === item ? "active" : ""} onClick={() => setPanel(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      <div className={`workspace active-${panel} ${workflowOpen ? "workflow-open" : "workflow-closed"}`}>
        <SourceSidebar sources={sources} selectedId={selectedSourceId} repository={repository} onSelect={selectSource} onOpen={openSource} onAdd={() => setModalOpen(true)} />
        <ChatPanel messages={messages} thinking={thinking} error={chatError} disabled={!sources.length} onSend={sendMessage} onCitation={openCitation} onAdd={() => setModalOpen(true)} onDismissError={() => setChatError("")} />
        <WorkflowPanel workflow={workflow} progress={progress} selectedId={selectedStepId} loading={workflowLoading} error={workflowError} hasSources={Boolean(sources.length)} open={workflowOpen} onOpenChange={setWorkflowOpen} onSelect={setSelectedStepId} onSetCurrent={setCurrentStep} onComplete={completeCurrent} onPrevious={() => moveCurrent(-1)} onNext={() => moveCurrent(1)} onRetry={() => void runWorkflow(sources, repository)} />
      </div>
      {modalOpen ? <AddMaterialsModal onClose={() => setModalOpen(false)} onRepository={addRepository} onFiles={addFiles} onPaste={addPaste} /> : null}
      {readerSource ? <SourceReader source={readerSource} section={readerTarget?.section} excerpt={readerTarget?.excerpt} onClose={() => setReaderTarget(null)} /> : null}
      <Toast message={toast} />
    </main>
  );
}
