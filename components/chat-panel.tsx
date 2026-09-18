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
  onSend: (value: string) => void;
  onCitation: (citation: Citation) => void;
  onAdd: () => void;
  onDismissError: () => void;
};

const prompts = ["What should I do next?", "What does checkpoint 1 require?", "How do I run this project?", "Show sources"];

export function ChatPanel({ messages, thinking, error, disabled, onSend, onCitation, onAdd, onDismissError }: Props) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, thinking, error]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || thinking || disabled) return;
    onSend(value.trim());
    setValue("");
  }

  const hasConversation = messages.length > 0 || thinking || Boolean(error);

  return (
    <section className={`chat-panel ${hasConversation ? "has-conversation" : ""}`}>
      {hasConversation ? <div className="conversation" data-lenis-prevent>
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <div className="message-meta"><span className={message.role === "assistant" ? "agent-mark" : "user-mark"}>{message.role === "assistant" ? "AI" : "You"}</span></div>
            <div className="message-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              {message.citations?.length ? <div className="citation-area"><span>Sources</span><div>{message.citations.map((citation) => (
                <button type="button" key={`${citation.sourceId}-${citation.section}-${citation.excerpt}`} className="citation-chip" onClick={() => onCitation(citation)}><i>MD</i><span><strong>{citation.file}</strong><small>{citation.section}</small><em>{citation.excerpt}</em></span></button>
              ))}</div></div> : null}
            </div>
          </article>
        ))}
        {thinking ? <div className="thinking"><span>Checking sources</span><i /><i /><i /></div> : null}
        {error ? <div className="chat-error" role="alert"><div><strong>Chat request failed</strong><p>{error}</p></div><button type="button" onClick={onDismissError}>Dismiss</button></div> : null}
        <div ref={endRef} />
      </div> : <p className="chat-hint">Ask about your lab, its commands, checkpoints, or what to do next.</p>}
      <div className="composer-zone">
        <div className="quick-prompts" data-lenis-prevent-horizontal>{prompts.map((prompt) => <button type="button" key={prompt} disabled={disabled || thinking} onClick={() => onSend(prompt)}>{prompt}</button>)}</div>
        <form className="composer" onSubmit={submit}>
          <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={disabled ? "Add materials to start asking questions…" : "Ask about your lab…"} disabled={disabled} rows={2} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <div className="composer-tools"><div><button type="button" onClick={onAdd}><PlusIcon size={14} />Material</button><span>{disabled ? "Sources required" : "Source-grounded AI"}</span></div><button className="send-button" type="submit" aria-label="Send message" disabled={!value.trim() || disabled || thinking}><SendIcon size={17} /></button></div>
        </form>
      </div>
    </section>
  );
}
