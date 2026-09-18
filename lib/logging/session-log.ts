import type { LogEvent, LogEventType } from "./logger";
import { redactValue } from "./redact";

const SESSION_STORAGE_KEY = "ai20k-opencode-session";
const MAX_SESSION_EVENTS = 200;

type SessionContext = {
  repoId: string;
  sessionId: string;
  startedAt: string;
};

let context: SessionContext | null = null;

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function providerSessionId(): string {
  if (context?.sessionId) return context.sessionId;
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // sessionStorage unavailable — fall through to an ephemeral id
  }
  return "browser-session";
}

export function setSessionLogContext(input: { repoId: string; sessionId?: string }): void {
  context = {
    repoId: input.repoId,
    sessionId: input.sessionId || (storageAvailable() ? providerSessionId() : "browser-session"),
    startedAt: context?.startedAt || new Date().toISOString()
  };
  if (context.sessionId === "browser-session" && storageAvailable()) {
    context.sessionId = providerSessionId();
  }
}

function storageKey(): string | null {
  if (!storageAvailable() || !context) return null;
  return `ai20k-lab-log:${context.repoId}:${context.sessionId}`;
}

function readEvents(): LogEvent[] {
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append one evaluation event to the per-repository/session buffer (max 200). No-op without a session context. */
export function appendSessionEvent(eventType: LogEventType, data: Record<string, unknown> = {}): void {
  const key = storageKey();
  if (!key || !context) return;
  try {
    const events = readEvents();
    events.push({
      timestamp: new Date().toISOString(),
      eventType,
      sessionId: context.sessionId,
      repoId: context.repoId,
      requestId: `client-${Date.now().toString(36)}-${events.length}`,
      data: redactValue(data) as Record<string, unknown>
    });
    window.localStorage.setItem(key, JSON.stringify(events.slice(-MAX_SESSION_EVENTS)));
  } catch {
    // Storage full or unavailable — evaluation logging must never break the app.
  }
}

export function getSessionLog(): { sessionId: string; repository: string; startedAt: string; events: LogEvent[] } {
  return {
    sessionId: context?.sessionId || "browser-session",
    repository: context?.repoId || "local-files",
    startedAt: context?.startedAt || new Date().toISOString(),
    events: readEvents()
  };
}

export function getSessionEventCount(): number {
  return readEvents().length;
}

/** Download the current session evaluation log as JSON. No database required. */
export function downloadSessionLog(): void {
  if (!storageAvailable()) return;
  const payload = JSON.stringify(getSessionLog(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ai20k-lab-log-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Clear only the current session/repo evaluation log — never touches workflow progress. */
export function clearSessionLog(): void {
  const key = storageKey();
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
