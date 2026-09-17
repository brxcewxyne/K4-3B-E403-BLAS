"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { MockMessage } from "@/mock/lab-data";

type Props = {
  messages: MockMessage[];
  isThinking: boolean;
  sourceCount: number;
  onSend: (message: string) => void;
  onCitationClick: (filename: string) => void;
  onAddMaterial: () => void;
};

const suggestions = [
  "Tôi cần bắt đầu từ đâu?",
  "Lệnh chạy project là gì?",
  "Checkpoint 1 cần nộp gì?"
];

export function ChatPanel({ messages, isThinking, sourceCount, onSend, onCitationClick, onAddMaterial }: Props) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isThinking]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }

  return (
    <section className="chat-panel" aria-label="Lab guide chat">
      <div className="chat-header">
        <div>
          <div className="eyebrow">Guide assistant</div>
          <h2>What should I do next?</h2>
        </div>
        <div className="grounded-badge"><span />Grounded in {sourceCount} sources</div>
      </div>

      <div className="message-list">
        <div className="date-divider"><span>Today</span></div>
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <div className="message-author">
              <span className={`message-avatar ${message.role === "assistant" ? "assistant-avatar" : ""}`}>
                {message.role === "assistant" ? "AI" : "You"}
              </span>
              <div>
                <strong>{message.role === "assistant" ? "Lab Guide" : "You"}</strong>
                <span>{message.role === "assistant" ? "Source-backed answer" : "Student"}</span>
              </div>
            </div>

            <div className="message-body">
              <p>{message.content}</p>
              {message.steps?.length ? (
                <ol>
                  {message.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              ) : null}

              {message.citations?.length ? (
                <div className="citation-area">
                  <div className="citation-heading">Sources</div>
                  <div className="citation-grid">
                    {message.citations.map((citation) => (
                      <button
                        key={`${message.id}-${citation.filename}-${citation.section}`}
                        type="button"
                        className="citation-card"
                        onClick={() => onCitationClick(citation.filename)}
                      >
                        <span className="citation-file"><span>MD</span>{citation.filename}</span>
                        <small>{citation.section}</small>
                        <q>{citation.quote}</q>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {isThinking ? (
          <div className="thinking-row" role="status">
            <span className="message-avatar assistant-avatar">AI</span>
            <div className="thinking-bubble"><i /><i /><i /><span>Checking your lab sources...</span></div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="chat-composer-wrap">
        <div className="suggestions">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => onSend(suggestion)} disabled={isThinking}>
              {suggestion}
            </button>
          ))}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <button className="composer-add" type="button" onClick={onAddMaterial} aria-label="Add materials" title="Add materials">+</button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask about setup, checkpoints, commands..."
            rows={1}
          />
          <button className="send-button" type="submit" disabled={!input.trim() || isThinking}>
            Send <span aria-hidden="true">↑</span>
          </button>
        </form>
        <div className="composer-note">Answers use only the materials loaded in this workspace.</div>
      </div>
    </section>
  );
}
