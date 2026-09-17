"use client";

import { useMemo, useState } from "react";
import { AddMaterialsModal } from "@/components/add-materials-modal";
import { ChatPanel } from "@/components/chat-panel";
import { SourceSidebar } from "@/components/source-sidebar";
import { WorkflowPanel } from "@/components/workflow-panel";
import {
  initialMessages,
  lab,
  mockReplyFor,
  sources as initialSources,
  workflow,
  type LabSource,
  type MockMessage
} from "@/mock/lab-data";

export default function Home() {
  const [sources, setSources] = useState(initialSources);
  const [selectedSourceId, setSelectedSourceId] = useState(initialSources[1].id);
  const [messages, setMessages] = useState<MockMessage[]>(initialMessages);
  const [completedStepIds, setCompletedStepIds] = useState<number[]>([1, 2, 3]);
  const [selectedStepId, setSelectedStepId] = useState(4);
  const [isThinking, setIsThinking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const currentStep = useMemo(
    () => workflow.find((step) => !completedStepIds.includes(step.id)),
    [completedStepIds]
  );

  function selectSourceByName(filename: string) {
    const match = sources.find((source) => source.name === filename);
    if (match) setSelectedSourceId(match.id);
  }

  function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isThinking) return;

    const userMessage: MockMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };
    setMessages((current) => [...current, userMessage]);
    setIsThinking(true);

    window.setTimeout(() => {
      setMessages((current) => [...current, mockReplyFor(trimmed)]);
      setIsThinking(false);
    }, 850);
  }

  function markCurrentComplete() {
    if (!currentStep) return;
    setCompletedStepIds((current) => [...current, currentStep.id]);
    const nextStep = workflow.find(
      (step) => step.id > currentStep.id && !completedStepIds.includes(step.id)
    );
    if (nextStep) setSelectedStepId(nextStep.id);
    showToast(`Đã hoàn thành bước ${currentStep.id}`);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function addRepository(repositoryUrl: string) {
    const repositoryName = repositoryUrl.split("/").filter(Boolean).pop() || "imported-lab";
    const newSource: LabSource = {
      id: `source-${Date.now()}`,
      name: `${repositoryName}.md`,
      kind: "Repository",
      status: "Ready",
      section: "Imported repository",
      preview: `Repository ${repositoryUrl} đã được thêm vào workspace. Nội dung đang dùng dữ liệu mô phỏng.`
    };
    setSources((current) => [...current, newSource]);
    setSelectedSourceId(newSource.id);
    setIsModalOpen(false);
    showToast("Repository added");
  }

  function addMockMaterial(name: string, kind: LabSource["kind"], preview: string) {
    const newSource: LabSource = {
      id: `source-${Date.now()}`,
      name,
      kind,
      status: "Ready",
      section: "New material",
      preview
    };
    setSources((current) => [...current, newSource]);
    setSelectedSourceId(newSource.id);
    setIsModalOpen(false);
    showToast("Material added");
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">A</div>
          <div>
            <div className="brand-name">AI20k Lab Guide</div>
            <div className="mobile-lab-name">Day 05 Agent Lab</div>
          </div>
        </div>

        <div className="lab-breadcrumb" aria-label="Current lab">
          <span>Day 05</span>
          <span className="breadcrumb-divider">/</span>
          <strong>IT Helpdesk Agent Lab</strong>
        </div>

        <div className="topbar-actions">
          <div className="ready-status"><span className="status-dot" />{sources.length} sources ready</div>
          <button className="icon-button" type="button" aria-label="Settings" title="Settings">...</button>
          <div className="avatar" aria-label="Student avatar">ST</div>
        </div>
      </header>

      <div className="workspace-grid">
        <SourceSidebar
          lab={lab}
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelect={setSelectedSourceId}
          onAdd={() => setIsModalOpen(true)}
        />

        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          sourceCount={sources.length}
          onSend={sendMessage}
          onCitationClick={selectSourceByName}
          onAddMaterial={() => setIsModalOpen(true)}
        />

        <WorkflowPanel
          steps={workflow}
          completedStepIds={completedStepIds}
          currentStepId={currentStep?.id}
          selectedStepId={selectedStepId}
          onSelectStep={setSelectedStepId}
          onMarkComplete={markCurrentComplete}
        />
      </div>

      {isModalOpen ? (
        <AddMaterialsModal
          onClose={() => setIsModalOpen(false)}
          onImportRepository={addRepository}
          onAddMaterial={addMockMaterial}
        />
      ) : null}

      {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
    </main>
  );
}
