"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/client-types";

type Props = { messages: ChatMessage[]; isThinking: boolean; error: string; sourceCount: number; checkpoint: string; isDemoMode: boolean; onSend: (message: string) => void; onCitationClick: (filename: string) => void; onAddMaterial: () => void; onDismissError: () => void };

const suggestions = ["What should I do next?", "What are the requirements?", "Am I ready for the next step?", "Show sources for this step"];

export function ChatPanel({ messages, isThinking, error, sourceCount, checkpoint, isDemoMode, onSend, onCitationClick, onAddMaterial, onDismissError }: Props) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, isThinking, error]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }

  return <section className="chat-panel" aria-label="Lab guide chat">
    <div className="chat-header"><div><div className="context-line"><span>{checkpoint}</span><span>•</span><span>AI workspace</span></div><h2>What should I do next?</h2></div><div className="grounded-badge"><span />Grounded in {sourceCount} sources</div></div>
    <div className="message-list" aria-live="polite"><div className="date-divider"><span>Today</span></div>
      {messages.length === 0 ? <div className="chat-empty"><div className="empty-orbit">A</div><h3>Ask your lab guide</h3><p>Your answers will be grounded in the materials shown in Sources.</p></div> : messages.map((message) => <article key={message.id} className={`message ${message.role}`}>
        <div className="message-author"><span className={`message-avatar ${message.role === "assistant" ? "assistant-avatar" : ""}`}>{message.role === "assistant" ? "AI" : "You"}</span><div><strong>{message.role === "assistant" ? "Lab Guide" : "You"}</strong><span>{message.role === "assistant" ? message.grounded ? "Source-backed answer" : "Answer" : "Student"}</span></div></div>
        <div className="message-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          {message.role === "assistant" && message.citations?.length ? <div className="citation-area"><div className="citation-heading">Sources</div><div className="citation-grid">{message.citations.map((citation, index) => <button key={`${message.id}-${citation.filename}-${citation.section}-${index}`} type="button" className="citation-card" onClick={() => onCitationClick(citation.filename)}><span className="citation-file"><span>MD</span>{citation.filename}</span><small>{citation.section}{citation.line ? ` · ${citation.line}` : ""}</small>{citation.quote ? <q>{citation.quote}</q> : <span className="citation-note">Open source details</span>}</button>)}</div></div> : null}
          {message.role === "assistant" && message.grounded === false ? <div className="ungrounded-note">No source evidence was returned for this answer.</div> : null}
        </div>
      </article>)}
      {isThinking ? <div className="thinking-row" role="status"><span className="message-avatar assistant-avatar">AI</span><div className="thinking-bubble"><i /><i /><i /><span>Checking your lab sources…</span></div></div> : null}
      {error ? <div className="inline-error" role="alert"><div><strong>Couldn’t reach the guide</strong><p>{error}</p></div><button type="button" onClick={onDismissError}>Dismiss</button></div> : null}<div ref={endRef} />
    </div>
    <div className="chat-composer-wrap"><div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => onSend(suggestion)} disabled={isThinking}>{suggestion}</button>)}</div><form className="chat-composer" onSubmit={submit}><button className="composer-add" type="button" onClick={onAddMaterial} aria-label="Add materials" title="Add materials">+</button><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask about requirements, next steps, commands, checkpoints…" rows={1} aria-label="Message the lab guide" disabled={isThinking} /><button className="send-button" type="submit" disabled={!input.trim() || isThinking}>{isThinking ? "Working…" : "Send"}<span aria-hidden="true">↑</span></button></form><div className="composer-note">{isDemoMode ? "Deterministic demo responses · No backend requests are sent." : "Answers use only the materials loaded in this workspace."} Enter to send · Shift+Enter for a new line.</div></div>
  </section>;
}
