import { AppError } from "../shared/api";

type ModelKind = "chat" | "summarize";

function config(kind: ModelKind) {
  const apiKey = process.env.AI_API_KEY;
  const model = kind === "chat" ? process.env.AI_CHAT_MODEL : process.env.AI_SUMMARIZE_MODEL;
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "AI_API_KEY is not configured on the server.", 503);
  if (!model) throw new AppError("AI_NOT_CONFIGURED", `${kind === "chat" ? "AI_CHAT_MODEL" : "AI_SUMMARIZE_MODEL"} is not configured on the server.`, 503);
  return { apiKey, model, baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "") };
}

function textFromResponse(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFromResponse).join("");
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.output_text === "string") return item.output_text;
    if (typeof item.text === "string") return item.text;
    if (typeof item.content === "string") return item.content;
    return Object.values(item).map(textFromResponse).join("");
  }
  return "";
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AppError("AI_MALFORMED_RESPONSE", "The AI provider returned an invalid structured response.", 502);
  try { return JSON.parse(cleaned.slice(start, end + 1)) as unknown; }
  catch { throw new AppError("AI_MALFORMED_RESPONSE", "The AI provider returned invalid JSON.", 502); }
}

export async function generateJson(kind: ModelKind, system: string, user: string) {
  const { apiKey, model, baseUrl } = config(kind);
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const responses = await fetch(`${baseUrl}/responses`, {
    method: "POST", headers, signal: AbortSignal.timeout(55_000),
    body: JSON.stringify({ model, input: [{ role: "system", content: system }, { role: "user", content: user }], text: { format: { type: "json_object" } } })
  }).catch(() => null);
  if (responses?.ok) return parseJson(textFromResponse(await responses.json()));

  const chat = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers, signal: AbortSignal.timeout(55_000),
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" } })
  }).catch(() => null);
  if (!chat?.ok) throw new AppError("AI_PROVIDER_ERROR", "The AI provider did not return a successful response.", 502);
  const json = await chat.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseJson(json.choices?.[0]?.message?.content || "");
}
