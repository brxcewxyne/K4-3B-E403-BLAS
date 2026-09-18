import { hashString, redactValue } from "./redact";

export type LogEventType =
  | "source_ingest_started"
  | "source_ingest_completed"
  | "source_ingest_failed"
  | "workflow_generation_started"
  | "workflow_generation_completed"
  | "workflow_generation_failed"
  | "workflow_generation_fallback"
  | "workflow_step_selected"
  | "workflow_step_set_current"
  | "workflow_step_completed"
  | "chat_request_started"
  | "chat_request_completed"
  | "chat_request_failed";

export type LogEvent = {
  timestamp: string;
  eventType: LogEventType;
  sessionId?: string;
  repoId?: string;
  requestId: string;
  data: Record<string, unknown>;
};

function createRequestId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function isVerboseEvalLogs(): boolean {
  return typeof process !== "undefined" && process.env?.ENABLE_VERBOSE_EVAL_LOGS === "true";
}

/**
 * Emit one structured JSON log line (server observability). Secrets are
 * redacted; only metadata is logged unless verbose eval logging is enabled.
 */
export function logEvent(input: {
  eventType: LogEventType;
  sessionId?: string;
  repoId?: string;
  requestId?: string;
  data?: Record<string, unknown>;
}): LogEvent {
  const event: LogEvent = {
    timestamp: new Date().toISOString(),
    eventType: input.eventType,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.repoId ? { repoId: input.repoId } : {}),
    requestId: input.requestId || createRequestId(),
    data: (redactValue(input.data ?? {}) as Record<string, unknown>)
  };
  console.info(JSON.stringify(event));
  return event;
}

export { hashString };
