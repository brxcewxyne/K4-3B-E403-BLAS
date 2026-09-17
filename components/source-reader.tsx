"use client";

import { Children, isValidElement, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CloseIcon } from "./icons";
import type { SourceDocument } from "@/lib/shared/types";

type Props = {
  source: SourceDocument;
  section?: string;
  excerpt?: string;
  onClose: () => void;
};

function textFromChildren(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return textFromChildren(child.props.children);
    return "";
  }).join("");
}

function headingId(value: string) {
  return `source-${value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function htmlProps<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const cleaned = { ...props };
  delete cleaned.node;
  return cleaned;
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => <h1 {...htmlProps(props)} id={headingId(textFromChildren(children))} data-source-heading>{children}</h1>,
  h2: ({ children, ...props }) => <h2 {...htmlProps(props)} id={headingId(textFromChildren(children))} data-source-heading>{children}</h2>,
  h3: ({ children, ...props }) => <h3 {...htmlProps(props)} id={headingId(textFromChildren(children))} data-source-heading>{children}</h3>,
  h4: ({ children, ...props }) => <h4 {...htmlProps(props)} id={headingId(textFromChildren(children))} data-source-heading>{children}</h4>,
  h5: ({ children, ...props }) => <h5 {...htmlProps(props)} id={headingId(textFromChildren(children))} data-source-heading>{children}</h5>,
  h6: ({ children, ...props }) => <h6 {...htmlProps(props)} id={headingId(textFromChildren(children))} data-source-heading>{children}</h6>,
  a: ({ children, ...props }) => <a {...htmlProps(props)} target="_blank" rel="noreferrer">{children}</a>
};

export function SourceReader({ source, section, excerpt, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [mounted, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const frame = window.requestAnimationFrame(() => {
      const content = contentRef.current;
      if (!content) return;
      const target = section
        ? Array.from(content.querySelectorAll<HTMLElement>("[data-source-heading]")).find((heading) => heading.textContent?.trim().toLowerCase() === section.trim().toLowerCase())
        : null;
      if (!target) { content.scrollTop = 0; return; }
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      target.classList.add("reader-target");
      window.setTimeout(() => target.classList.remove("reader-target"), 1800);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, section, source.id]);

  if (!mounted) return null;

  return createPortal(
    <div className="reader-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="source-reader" role="dialog" aria-modal="true" aria-labelledby="source-reader-title">
        <header className="reader-header">
          <div><span className="kicker">Source document</span><h2 id="source-reader-title">{source.name}</h2><p>{source.path}</p></div>
          <div><span>{source.type === "mdx" ? "MDX" : "Markdown"}</span><button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close source reader"><CloseIcon /></button></div>
        </header>
        {excerpt ? <aside className="reader-citation"><span>Cited passage{section ? ` · ${section}` : ""}</span><p>{excerpt}</p></aside> : null}
        <div ref={contentRef} className="reader-content" data-lenis-prevent>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {source.content}
          </ReactMarkdown>
        </div>
      </section>
    </div>,
    document.body
  );
}
