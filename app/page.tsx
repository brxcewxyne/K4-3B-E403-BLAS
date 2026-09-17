"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddMaterialsModal } from "@/components/add-materials-modal";
import { ChatPanel } from "@/components/chat-panel";
import { SourceSidebar } from "@/components/source-sidebar";
import { WorkflowPanel } from "@/components/workflow-panel";
import { askGuide, createDemoGuide, getGuide, getGuideSources, importGithubGuide, importZipGuide } from "@/lib/api-client";
import type { ChatMessage, GuideResponse, LabSource, WorkflowStep } from "@/lib/client-types";

const GUIDE_STORAGE_KEY = "ai20k-active-guide";

function compactPreview(content: string) {
  return content.replace(/^#{1,6}\s+/gm, "").replace(/[`*_>-]/g, "").replace(/\s+/g, " ").trim().slice(0, 230);
}

function sourceSection(content: string) {
  return content.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim() || "Source document";
}

function workflowFromGuide(guide: GuideResponse): WorkflowStep[] {
  return [...guide.structuredContent.steps].sort((a, b) => a.order - b.order).map((step) => ({
    id: step.order,
    title: step.title,
    description: step.purpose || "Follow the actions in this step and verify the expected result.",
    actions: [...step.instructions, ...step.commands.map((command) => command.description ? `${command.description}: ${command.command}` : command.command)],
    criteria: step.expectedResult ? [step.expectedResult] : ["Required actions are complete"],
    sources: step.sources,
    expectedResult: step.expectedResult
  }));
}

function readProgress(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === "number") : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [guide, setGuide] = useState<GuideResponse | null>(null);
  const [sources, setSources] = useState<LabSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [completedStepIds, setCompletedStepIds] = useState<number[]>([]);
  const [selectedStepId, setSelectedStepId] = useState(1);
  const [sessionId, setSessionId] = useState<string>();
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [chatError, setChatError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"sources" | "chat" | "workflow">("chat");

  const workflow = useMemo(() => guide ? workflowFromGuide(guide) : [], [guide]);
  const currentStep = useMemo(() => workflow.find((step) => !completedStepIds.includes(step.id)), [completedStepIds, workflow]);

  const loadWorkspace = useCallback(async (guideId: string) => {
    const [guideData, sourceData] = await Promise.all([getGuide(guideId), getGuideSources(guideId)]);
    const loadedSources: LabSource[] = sourceData.sources.map((source) => ({
      id: source.id,
      name: source.path.split("/").pop() || source.path,
      path: source.path,
      kind: "Markdown",
      status: "Indexed",
      section: sourceSection(source.content),
      preview: compactPreview(source.content),
      content: source.content
    }));
    setGuide(guideData);
    setSources(loadedSources);
    setSelectedSourceId(loadedSources[0]?.id || "");
    setCompletedStepIds(readProgress(window.localStorage.getItem(`ai20k-progress-${guideId}`)));
    setSelectedStepId(guideData.structuredContent.steps[0]?.order || 1);
    setMessages([{ id: `welcome-${guideId}`, role: "assistant", content: `I’ve indexed ${loadedSources.length} source${loadedSources.length === 1 ? "" : "s"} for “${guideData.title}”. Ask me about requirements, commands, checkpoints, or your next step.`, grounded: true }]);
    setSessionId(undefined);
    window.localStorage.setItem(GUIDE_STORAGE_KEY, guideId);
  }, []);

  const initialize = useCallback(async () => {
    setIsLoadingWorkspace(true);
    setWorkspaceError("");
    try {
      const savedGuideId = window.localStorage.getItem(GUIDE_STORAGE_KEY);
      if (savedGuideId) {
        try { await loadWorkspace(savedGuideId); return; } catch { window.localStorage.removeItem(GUIDE_STORAGE_KEY); }
      }
      const demo = await createDemoGuide();
      await loadWorkspace(demo.id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not connect to the guide backend.");
    } finally { setIsLoadingWorkspace(false); }
  }, [loadWorkspace]);

  useEffect(() => { void initialize(); }, [initialize]);

  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isThinking || !guide) return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: trimmed }]);
    setIsThinking(true);
    setChatError("");
    try {
      const result = await askGuide({ guideId: guide.id, message: trimmed, sessionId });
      setSessionId(result.sessionId);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: result.answer, grounded: result.sources.length > 0, citations: result.sources.map((source) => ({ filename: source.file, section: source.section })) }]);
    } catch (error) { setChatError(error instanceof Error ? error.message : "The guide assistant could not answer."); }
    finally { setIsThinking(false); }
  }

  function selectSourceByName(filename: string) {
    const normalized = filename.toLowerCase();
    const match = sources.find((source) => source.name.toLowerCase() === normalized || source.path.toLowerCase() === normalized);
    if (match) { setSelectedSourceId(match.id); setMobilePanel("sources"); }
    else if (filename === "LAB_GUIDE.md") showToast("This citation refers to the generated guide synthesized from all loaded sources.");
  }

  function markCurrentComplete() {
    if (!currentStep || !guide) return;
    const nextCompleted = [...completedStepIds, currentStep.id];
    setCompletedStepIds(nextCompleted);
    window.localStorage.setItem(`ai20k-progress-${guide.id}`, JSON.stringify(nextCompleted));
    const nextStep = workflow.find((step) => !nextCompleted.includes(step.id));
    if (nextStep) setSelectedStepId(nextStep.id);
    showToast(`Step ${currentStep.id} completed`);
  }

  async function addRepository(repositoryUrl: string) {
    const result = await importGithubGuide(repositoryUrl);
    await loadWorkspace(result.id);
    setIsModalOpen(false);
    showToast(`${result.filesFound.length} sources imported`);
  }

  async function addZip(file: File) {
    const result = await importZipGuide(file);
    await loadWorkspace(result.id);
    setIsModalOpen(false);
    showToast(`${result.filesFound.length} sources imported`);
  }

  function addLocalMaterial(name: string, content: string) {
    const newSource: LabSource = { id: `local-${Date.now()}`, name, path: name, kind: "Markdown", status: "Ready", section: sourceSection(content), preview: compactPreview(content), content };
    setSources((current) => [...current, newSource]);
    setSelectedSourceId(newSource.id);
    setIsModalOpen(false);
    showToast("Added as a local preview; AI indexing is not available for this mode yet");
  }

  if (isLoadingWorkspace) return <main className="workspace-state"><div className="state-spinner" /><h1>Preparing your lab workspace</h1><p>Loading guide, sources, and workflow…</p></main>;

  if (workspaceError || !guide) return <main className="workspace-state"><div className="state-icon">!</div><h1>Workspace unavailable</h1><p>{workspaceError}</p><button className="primary-button" onClick={() => void initialize()}>Try again</button><button className="text-button" onClick={() => setIsModalOpen(true)}>Import a repository</button>{isModalOpen ? <AddMaterialsModal onClose={() => setIsModalOpen(false)} onImportRepository={addRepository} onImportZip={addZip} onAddLocalMaterial={addLocalMaterial} /> : null}</main>;

  return <main className="workspace-shell">
    <header className="topbar"><div className="brand-block"><div className="brand-mark" aria-hidden="true">A</div><div><div className="brand-name">AI20k Lab Guide</div><div className="mobile-lab-name">{guide.title}</div></div></div><div className="lab-breadcrumb" aria-label="Current lab"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{guide.title}</strong></div><div className="topbar-actions"><div className="ready-status"><span className="status-dot" />{sources.filter((source) => source.status !== "Failed").length} sources ready</div><div className="agent-status">Agent connected</div><div className="avatar" aria-label="Student avatar">ST</div></div></header>
    <nav className="mobile-tabs" aria-label="Workspace panels">{(["sources", "chat", "workflow"] as const).map((panel) => <button key={panel} type="button" className={mobilePanel === panel ? "active" : ""} onClick={() => setMobilePanel(panel)}>{panel === "workflow" ? "Progress" : panel[0].toUpperCase() + panel.slice(1)}</button>)}</nav>
    <div className={`workspace-grid mobile-${mobilePanel}`}>
      <SourceSidebar lab={{ title: guide.title, subtitle: guide.repositoryUrl || "Uploaded materials" }} sources={sources} selectedSourceId={selectedSourceId} onSelect={setSelectedSourceId} onAdd={() => setIsModalOpen(true)} />
      <ChatPanel messages={messages} isThinking={isThinking} error={chatError} sourceCount={sources.filter((source) => !source.id.startsWith("local-")).length} checkpoint={currentStep ? `Step ${currentStep.id}` : "Complete"} onSend={sendMessage} onCitationClick={selectSourceByName} onAddMaterial={() => setIsModalOpen(true)} onDismissError={() => setChatError("")} />
      <WorkflowPanel steps={workflow} completedStepIds={completedStepIds} currentStepId={currentStep?.id} selectedStepId={selectedStepId} onSelectStep={setSelectedStepId} onMarkComplete={markCurrentComplete} />
    </div>
    {isModalOpen ? <AddMaterialsModal onClose={() => setIsModalOpen(false)} onImportRepository={addRepository} onImportZip={addZip} onAddLocalMaterial={addLocalMaterial} /> : null}
    {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
  </main>;
}
