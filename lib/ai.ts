import { CHAT_SYSTEM_PROMPT, SUMMARIZER_SYSTEM_PROMPT } from "./constants";
import { UserFacingError } from "./errors";
import { formatSourcesForAi, type MarkdownDocument } from "./markdown";
import {
  chatAnswerSchema,
  generatedGuideSchema,
  sourceSummarySchema,
  type ChatAnswer,
  type GeneratedGuide
} from "./schemas";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new UserFacingError(`Thiếu biến môi trường ${name}.`, 500);
  }
  return value;
}

function apiBaseUrl() {
  return (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(extractText).join("");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.output_text === "string") {
      return record.output_text;
    }
    if (typeof record.text === "string") {
      return record.text;
    }
    if (typeof record.content === "string") {
      return record.content;
    }
    return Object.values(record).map(extractText).join("");
  }
  return "";
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new UserFacingError("LLM không trả về JSON hợp lệ.", 502);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}

async function callJsonModel(model: string, system: string, user: string) {
  const apiKey = requireEnv("AI_API_KEY");
  const baseUrl = apiBaseUrl();

  const responsesResult = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      text: { format: { type: "json_object" } }
    })
  }).catch(() => null);

  if (responsesResult?.ok) {
    const json = (await responsesResult.json()) as unknown;
    return parseJsonObject(extractText(json));
  }

  const chatResult = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!chatResult.ok) {
    throw new UserFacingError("LLM không phản hồi hoặc cấu hình API chưa đúng.", 502);
  }

  const json = (await chatResult.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseJsonObject(json.choices?.[0]?.message?.content || "");
}

function guideSchemaPrompt() {
  return `Trả về JSON theo schema:
{
  "title": "string",
  "overview": "string",
  "objectives": ["string"],
  "prerequisites": [{ "content": "string", "sources": ["path"] }],
  "steps": [{
    "order": 1,
    "title": "string",
    "purpose": "string",
    "instructions": ["string"],
    "commands": [{ "command": "string", "description": "string" }],
    "expectedResult": "string",
    "sources": ["path"]
  }],
  "completionRequirements": [{ "content": "string", "sources": ["path"] }],
  "suggestions": [{ "content": "string", "sources": ["path"] }],
  "commonErrors": [{ "problem": "string", "suggestion": "string", "sources": ["path"] }],
  "conflicts": [{ "description": "string", "sources": ["path"] }],
  "sources": ["path"]
}`;
}

export async function generateGuide(documents: MarkdownDocument[]): Promise<GeneratedGuide> {
  const model = requireEnv("AI_SUMMARIZE_MODEL");
  const sourcePayload = formatSourcesForAi(documents);

  const prompt = `${guideSchemaPrompt()}

Tài liệu nguồn:

${sourcePayload}`;

  const result = await callJsonModel(model, SUMMARIZER_SYSTEM_PROMPT, prompt);
  const parsed = generatedGuideSchema.safeParse(result);
  if (!parsed.success) {
    throw new UserFacingError("Structured output không đúng schema GeneratedGuide.", 502);
  }
  return parsed.data;
}

export async function summarizeSingleSource(document: MarkdownDocument) {
  const model = requireEnv("AI_SUMMARIZE_MODEL");
  const prompt = `Tóm tắt file sau thành JSON theo SourceSummary schema. Giữ nguyên command và cấu hình quan trọng.

Schema:
{
  "sourcePath": "string",
  "overview": "string",
  "objectives": ["string"],
  "prerequisites": ["string"],
  "requiredTasks": ["string"],
  "suggestedTasks": ["string"],
  "commands": [{ "command": "string", "purpose": "string" }],
  "expectedResults": ["string"],
  "commonErrors": ["string"],
  "possibleConflicts": ["string"]
}

===== SOURCE FILE: ${document.path} =====
${document.content}`;

  const result = await callJsonModel(model, SUMMARIZER_SYSTEM_PROMPT, prompt);
  const parsed = sourceSummarySchema.safeParse(result);
  if (!parsed.success) {
    throw new UserFacingError("Structured output không đúng schema SourceSummary.", 502);
  }
  return parsed.data;
}

export async function answerGuideQuestion(input: {
  guideMarkdown: string;
  sourceList: string[];
  history: { role: string; content: string }[];
  message: string;
}): Promise<ChatAnswer> {
  const model = requireEnv("AI_CHAT_MODEL");
  const relevantGuide = selectGuideContext(input.guideMarkdown, input.message);
  const prompt = `Trả về JSON theo schema:
{
  "answer": "string",
  "sources": [{ "file": "LAB_GUIDE.md", "section": "string" }]
}

LAB_GUIDE:
${relevantGuide}

Danh sách nguồn gốc:
${input.sourceList.join("\n")}

Lịch sử hội thoại gần nhất:
${input.history.map((item) => `${item.role}: ${item.content}`).join("\n")}

Câu hỏi mới:
${input.message}`;

  const result = await callJsonModel(model, CHAT_SYSTEM_PROMPT, prompt);
  const parsed = chatAnswerSchema.safeParse(result);
  if (!parsed.success) {
    throw new UserFacingError("Structured output không đúng schema chatbot.", 502);
  }
  return parsed.data;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^\p{L}\p{N}._/-]+/u)
    .filter((word) => word.length > 2);
}

function splitSections(markdown: string) {
  const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  if (matches.length === 0) {
    return [{ title: "LAB_GUIDE.md", body: markdown }];
  }

  return matches.map((match, index) => {
    const start = match.index || 0;
    const end = matches[index + 1]?.index ?? markdown.length;
    return {
      title: match[1],
      body: markdown.slice(start, end)
    };
  });
}

export function selectGuideContext(markdown: string, question: string) {
  if (Buffer.byteLength(markdown, "utf8") <= 120_000) {
    return markdown;
  }

  const words = new Set(tokenize(question));
  const ranked = splitSections(markdown)
    .map((section) => {
      const score = tokenize(section.body).filter((word) => words.has(word)).length;
      return { ...section, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return ranked.map((section) => section.body).join("\n\n");
}
