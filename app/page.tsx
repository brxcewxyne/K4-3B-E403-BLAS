"use client";

import { useMemo, useState } from "react";
import { AddMaterialsModal } from "@/components/add-materials-modal";
import { ChatPanel, type UiMessage } from "@/components/chat-panel";
import { SourceSidebar } from "@/components/source-sidebar";
import { Toast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { WorkflowPanel } from "@/components/workflow-panel";
import { askLabGuide, generateWorkflow, ingestFiles, ingestRepository } from "@/lib/client/api";
import type { LabWorkflow, SourceDocument } from "@/lib/shared/types";

type Panel = "sources" | "chat" | "workflow";

function storageKey(sources: SourceDocument[]) {
  return `ai20k-progress:${sources.map((source) => source.path).sort().join("|").slice(0, 500)}`;
}

function readStoredProgress(sources: SourceDocument[]) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(sources)) || "{}") as { completed?: unknown; sourceId?: unknown };
    return { completed: Array.isArray(value.completed) ? value.completed.filter((id): id is string => typeof id === "string") : [], sourceId: typeof value.sourceId === "string" ? value.sourceId : "" };
  } catch { return { completed: [], sourceId: "" }; }
}

export default function Home() {
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [repository, setRepository] = useState<string>();
  const [workflow, setWorkflow] = useState<LabWorkflow | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedStepId, setSelectedStepId] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [panel, setPanel] = useState<Panel>("chat");

  const currentStep = useMemo(() => workflow?.steps.find((step) => !completed.includes(step.id)), [workflow, completed]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function persist(nextCompleted: string[], sourceId = selectedSourceId) { if (sources.length) window.localStorage.setItem(storageKey(sources), JSON.stringify({ completed: nextCompleted, sourceId })); }

  async function buildWorkflow(nextSources: SourceDocument[], nextRepository?: string) {
    setSources(nextSources); setRepository(nextRepository); setSelectedSourceId(nextSources[0]?.id || ""); setWorkflow(null); setWorkflowLoading(true); setWorkflowError(""); setMessages([]); setModalOpen(false);
    try {
      const result = await generateWorkflow(nextSources);
      const saved = readStoredProgress(nextSources);
      setWorkflow(result.workflow); setCompleted(saved.completed.filter((id) => result.workflow.steps.some((step) => step.id === id))); setSelectedSourceId(saved.sourceId && nextSources.some((source) => source.id === saved.sourceId) ? saved.sourceId : nextSources[0]?.id || "");
      const first = result.workflow.steps.find((step) => !saved.completed.includes(step.id)) || result.workflow.steps[0];
      setSelectedStepId(first?.id || "");
      setMessages([{ id: "welcome", role: "assistant", content: `I’ve extracted **${result.workflow.steps.length} workflow steps** from ${nextSources.length} source${nextSources.length === 1 ? "" : "s"}. Ask me what to do next or what a checkpoint requires.` }]);
      notify("Sources indexed and workflow generated");
    } catch (error) { setWorkflowError(error instanceof Error ? error.message : "Workflow generation failed."); }
    finally { setWorkflowLoading(false); }
  }

  async function addRepository(url: string) { const result = await ingestRepository(url); await buildWorkflow(result.sources, result.repository); }
  async function addFiles(files: File[]) { const result = await ingestFiles(files); await buildWorkflow(result.sources); }
  async function addPaste(name: string, content: string) { const safeName = /\.(md|mdx)$/i.test(name) ? name : `${name || "notes"}.md`; await addFiles([new File([content], safeName, { type: "text/markdown" })]); }

  async function sendMessage(question: string) {
    if (!workflow || !sources.length || thinking) return;
    const user: UiMessage = { id: `user-${Date.now()}`, role: "user", content: question };
    setMessages((current) => [...current, user]); setThinking(true); setChatError("");
    try {
      const answer = await askLabGuide({ question, sources, workflow, currentStep: currentStep?.id, history: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })) });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: answer.answer, citations: answer.citations }]);
    } catch (error) { setChatError(error instanceof Error ? error.message : "Chat request failed."); }
    finally { setThinking(false); }
  }

  function selectSource(id: string, citation = false) {
    setSelectedSourceId(id); persist(completed, id);
    if (citation) { notify("Citation source selected"); if (window.matchMedia("(max-width: 1050px)").matches) setPanel("sources"); }
  }

  function completeCurrent() {
    if (!currentStep || !workflow) return;
    const next = [...completed, currentStep.id]; setCompleted(next); persist(next);
    const nextStep = workflow.steps.find((step) => !next.includes(step.id)); setSelectedStepId(nextStep?.id || currentStep.id); notify(`Step ${currentStep.order} completed`);
  }

  return <main className="app-shell"><div className="cinematic-bg" aria-hidden="true"><video autoPlay muted loop playsInline preload="metadata"><source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4" type="video/mp4" /></video><div /></div><TopBar title={workflow?.title} sourceCount={sources.length} /><nav className="panel-tabs">{(["sources", "chat", "workflow"] as Panel[]).map((item) => <button type="button" key={item} className={panel === item ? "active" : ""} onClick={() => setPanel(item)}>{item === "workflow" ? "Progress" : item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className={`workspace active-${panel}`}><SourceSidebar sources={sources} selectedId={selectedSourceId} repository={repository} onSelect={selectSource} onAdd={() => setModalOpen(true)} /><ChatPanel messages={messages} thinking={thinking} error={chatError} disabled={!workflow || workflowLoading} sourceCount={sources.length} currentStep={currentStep?.order} onSend={sendMessage} onCitation={(id) => selectSource(id, true)} onAdd={() => setModalOpen(true)} onDismissError={() => setChatError("")} /><WorkflowPanel workflow={workflow} completed={completed} selectedId={selectedStepId} loading={workflowLoading} error={workflowError} onSelect={setSelectedStepId} onComplete={completeCurrent} onRetry={() => void buildWorkflow(sources, repository)} /></div>{modalOpen ? <AddMaterialsModal onClose={() => setModalOpen(false)} onRepository={addRepository} onFiles={addFiles} onPaste={addPaste} /> : null}<Toast message={toast} /></main>;
}
