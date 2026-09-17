import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "../shared/api";

export type ModelKind = "chat" | "workflow";

const PROVIDER_NAME = "opencode-go";
const DEFAULT_BASE_URL = "https://opencode.ai/zen/go/v1";
const REQUEST_TIMEOUT_MS = 55_000;

type GenerationOptions = {
  timeoutMs?: number;
  requestLabel?: string;
};

function modelEnvironmentName(kind: ModelKind) {
  return kind === "chat" ? "AI_CHAT_MODEL" : "AI_SUMMARIZE_MODEL";
}

function providerConfig(kind: ModelKind) {
  const apiKey = process.env.AI_API_KEY;
  const environmentName = modelEnvironmentName(kind);
  const model = process.env[environmentName];

  if (!apiKey) {
    throw new AppError("AI_NOT_CONFIGURED", "AI_API_KEY is not configured on the server.", 503);
  }
  if (!model) {
    throw new AppError("AI_NOT_CONFIGURED", `${environmentName} is not configured on the server.`, 503);
  }

  return {
    apiKey,
    model,
    baseUrl: (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "")
  };
}

export function getAIProviderStatus() {
  return {
    aiProvider: PROVIDER_NAME,
    model: process.env.AI_CHAT_MODEL || null,
    configured: Boolean(process.env.AI_API_KEY && process.env.AI_CHAT_MODEL && process.env.AI_SUMMARIZE_MODEL),
    endpoint: "responses"
  } as const;
}

function responseText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const response = value as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown; output_text?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;

  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((item) => typeof item.text === "string" ? item.text : typeof item.output_text === "string" ? item.output_text : "")
    .join("");
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new AppError("AI_MALFORMED_RESPONSE", "The AI provider returned an invalid structured response.", 502);
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    throw new AppError("AI_MALFORMED_RESPONSE", "The AI provider returned invalid JSON.", 502);
  }
}

function providerError(status: number) {
  if (status === 401 || status === 403) {
    return new AppError("AI_AUTH_ERROR", "The AI provider rejected the configured credentials.", 503);
  }
  if (status === 429) {
    return new AppError("AI_RATE_LIMIT", "The AI provider rate limit was reached. Try again shortly.", 429);
  }
  if (status === 400 || status === 422) {
    return new AppError("AI_PROVIDER_REQUEST_ERROR", "The AI provider rejected the generation request.", 502);
  }
  if (status >= 500) {
    return new AppError("AI_PROVIDER_UNAVAILABLE", "The AI provider is temporarily unavailable.", 503);
  }
  return new AppError("AI_PROVIDER_ERROR", "The AI provider did not return a successful response.", 502);
}

function diagnosticSummary(value: unknown) {
  if (typeof value === "string") return value.slice(0, 300);
  if (!value || typeof value !== "object") return "No provider diagnostic";
  const record = value as { error?: unknown; code?: unknown; message?: unknown };
  const nested = record.error && typeof record.error === "object" ? record.error as { code?: unknown; message?: unknown } : null;
  return {
    code: typeof (nested?.code ?? record.code) === "string" ? nested?.code ?? record.code : undefined,
    message: typeof (nested?.message ?? record.message) === "string" ? String(nested?.message ?? record.message).slice(0, 300) : undefined
  };
}

export function createAIRequestSessionId(sessionId?: string) {
  return sessionId || randomUUID();
}

async function requestResponsesAPI(kind: ModelKind, system: string, user: string, sessionId?: string, options: GenerationOptions = {}) {
  const { apiKey, model, baseUrl } = providerConfig(kind);
  const stableSessionId = createAIRequestSessionId(sessionId);
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const startedAt = Date.now();
  let response: Response;

  console.info("OpenCode Go request started", { kind, model, timeoutMs, requestLabel: options.requestLabel || kind });

  try {
    response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-opencode-session": stableSessionId
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        text: { format: { type: "json_object" } }
      })
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    console.error("OpenCode Go request failed", { kind, timeout, timeoutMs, durationMs: Date.now() - startedAt, requestLabel: options.requestLabel || kind, error: error instanceof Error ? error.message : "Unknown network error" });
    throw timeout
      ? new AppError("AI_TIMEOUT", "The AI provider took too long to respond.", 504)
      : new AppError("AI_PROVIDER_UNAVAILABLE", "The AI provider could not be reached.", 503);
  }

  console.info("OpenCode Go request completed", { kind, status: response.status, durationMs: Date.now() - startedAt, requestLabel: options.requestLabel || kind });

  if (!response.ok) {
    let diagnostic: unknown;
    try { diagnostic = await response.json(); } catch { diagnostic = await response.text().catch(() => "Unreadable response"); }
    console.error("OpenCode Go returned an error", {
      kind,
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      diagnostic: diagnosticSummary(diagnostic)
    });
    throw providerError(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AppError("AI_MALFORMED_RESPONSE", "The AI provider returned an unreadable response.", 502);
  }
  const text = responseText(payload);
  if (!text) throw new AppError("AI_MALFORMED_RESPONSE", "The AI provider returned an empty response.", 502);
  return text;
}

export async function checkConfiguredModelAvailability(sessionId?: string) {
  const { apiKey, model, baseUrl } = providerConfig("chat");
  const stableSessionId = createAIRequestSessionId(sessionId);
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "x-opencode-session": stableSessionId
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store"
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    console.error("OpenCode Go model availability check failed", { timeout, error: error instanceof Error ? error.message : "Unknown network error" });
    throw timeout
      ? new AppError("AI_TIMEOUT", "The AI provider model check timed out.", 504)
      : new AppError("AI_PROVIDER_UNAVAILABLE", "The AI provider model list could not be reached.", 503);
  }

  if (!response.ok) {
    console.error("OpenCode Go model availability check returned an error", {
      status: response.status,
      requestId: response.headers.get("x-request-id")
    });
    throw providerError(response.status);
  }

  const payload = await response.json() as { data?: Array<{ id?: unknown }>; models?: Array<{ id?: unknown }> };
  const models = (payload.data || payload.models || []).flatMap((item) => typeof item.id === "string" ? [item.id] : []);
  const available = models.includes(model);
  console.info("OpenCode Go configured model availability", { model, available, modelCount: models.length });
  return { model, available, modelCount: models.length };
}

export async function generateJson(kind: ModelKind, system: string, user: string, sessionId?: string, options?: GenerationOptions) {
  return parseJson(await requestResponsesAPI(kind, system, user, sessionId, options));
}
