"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PlusIcon, SendIcon } from "./icons";
import type { Citation } from "@/lib/shared/types";

export type UiMessage = { id: string; role: "user" | "assistant"; content: string; citations?: Citation[] };
type Props = {
  messages: UiMessage[];
  thinking: boolean;
  error: string;
  disabled: boolean;
  sourceCount: number;
  currentStep?: number;
  onSend: (value: string) => void;
  onCitation: (citation: Citation) => void;
  onAdd: () => void;
  onDismissError: () => void;
};

const prompts = ["What should I do next?", "What are the requirements?", "Am I ready for the next checkpoint?", "Show sources for this step"];

export function ChatPanel({ messages, thinking, error, disabled, sourceCount, currentStep, onSend, onCitation, onAdd, onDismissError }: Props) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, thinking, error]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || thinking || disabled) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <section className="glass-panel chat-panel">
      <header className="chat-head"><div><span className="kicker">Guide workspace</span><h2>AI20k Lab Workflow Guide</h2></div><div className="context-chips"><span>{currentStep ? `Step ${currentStep}` : "No workflow"}</span><span>{sourceCount} sources</span><span className="grounded"><i />Grounded</span></div></header>
      <div className="conversation" data-lenis-prevent>
        {messages.length ? messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <div className="message-meta"><span className={message.role === "assistant" ? "agent-mark" : "user-mark"}>{message.role === "assistant" ? "AI" : "You"}</span><strong>{message.role === "assistant" ? "Guide Agent" : "You"}</strong></div>
            <div className="message-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              {message.citations?.length ? (
                <div className="citation-area"><span>Sources</span><div>{message.citations.map((citation) => (
                  <button type="button" key={`${citation.sourceId}-${citation.section}-${citation.excerpt}`} className="citation-chip" onClick={() => onCitation(citation)}>
                    <i>MD</i><span><strong>{citation.file}</strong><small>{citation.section}</small><em>{citation.excerpt}</em></span>
                  </button>
                ))}</div></div>
              ) : null}
            </div>
          </article>
        )) : (
          <div className="chat-empty"><span className="brand-orb large"><i /><i /><i /></span><h3>{disabled ? "Add lab materials to begin" : "What do you need to do next?"}</h3><p>{disabled ? "Import a public GitHub repository or upload Markdown files. The guide will extract your workflow automatically." : "Ask about requirements, checkpoints, commands, or the current step."}</p>{disabled ? <button type="button" className="accent-button" onClick={onAdd}>Add materials</button> : null}</div>
        )}
        {thinking ? <div className="thinking"><span>Checking sources</span><i /><i /><i /></div> : null}
        {error ? <div className="chat-error" role="alert"><div><strong>Chat request failed</strong><p>{error}</p></div><button type="button" onClick={onDismissError}>Dismiss</button></div> : null}
        <div ref={endRef} />
      </div>
      <div className="composer-zone">
        <div className="quick-prompts" data-lenis-prevent-horizontal>{prompts.map((prompt) => <button type="button" key={prompt} disabled={disabled || thinking} onClick={() => onSend(prompt)}>{prompt}</button>)}</div>
        <form className="composer" onSubmit={submit}>
          <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={disabled ? "Add materials before asking the guide…" : "Ask about requirements, next steps, commands, checkpoints..."} disabled={disabled || thinking} rows={2} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <div className="composer-tools"><div><button type="button" onClick={onAdd}><PlusIcon size={14} />Material</button><span>{currentStep ? `Current step · ${currentStep}` : "Waiting for workflow"}</span></div><button className="send-button" type="submit" disabled={!value.trim() || disabled || thinking}><SendIcon size={17} /></button></div>
        </form>
      </div>
    </section>
  );
}
