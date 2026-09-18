import type { SourceDocument, WorkflowStep } from "../shared/types";
import { setupScore } from "./context";

export const NEUTRAL_GOAL = "Complete the tasks defined in the provided lab materials.";
export const FALLBACK_TITLE = "Lab Workflow";

const GOAL_HEADING = /^(goals?|objectives?|learning objectives?|purpose|overview|about( this lab)?|what you will learn|mục tiêu|mục đích|tổng quan)\s*[:–—-]?$/i;

/**
 * A goal/title is suspicious when it looks like a technical identifier
 * (owner/repo, URL, path, filename, slug) rather than human language.
 * Human prose almost always contains spaces; slugs/paths/URLs do not
 * survive in the forms matched below.
 */
export function isTechnicalIdentifier(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (text.includes("/") && /^[\w.\-/]+$/.test(text)) return true;
  if (/^[\w.-]+\.(md|mdx|txt)$/i.test(text)) return true;
  const lowered = text.toLowerCase();
  if (/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/.test(lowered)) return true;
  return false;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** First H1 across sources in order — the most likely human-readable lab title. */
export function firstH1(sources: SourceDocument[]): string {
  for (const source of sources) {
    for (const line of source.content.split("\n")) {
      const match = line.match(/^#\s+(.+?)\s*$/);
      if (match) {
        const title = cleanInline(match[1]);
        if (title && !isTechnicalIdentifier(title)) return title;
      }
    }
  }
  return "";
}

/** Humanize a repo slug/path for title-only last-resort use. Never for goals. */
export function humanizeSlugLike(value: string): string {
  const segment = value.split("/").pop()?.replace(/\.git$/i, "") || "";
  const words = segment
    .split(/[-_]+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.join(" ");
}

/**
 * Source-grounded goal extraction: content under Goal/Objective/Overview-type
 * headings (EN + VI), first match wins, capped so huge paragraphs don't leak in.
 */
export function extractGoalFromSources(sources: SourceDocument[]): string {
  for (const source of sources) {
    const lines = source.content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const heading = lines[index].match(/^#{1,4}\s+(.+?)\s*$/)?.[1].trim() || "";
      if (!heading || !GOAL_HEADING.test(heading.replace(/[:–—-]$/, "").trim())) continue;
      const collected: string[] = [];
      let chars = 0;
      for (let cursor = index + 1; cursor < lines.length && collected.length < 3 && chars < 400; cursor += 1) {
        const line = lines[cursor].trim();
        if (!line || /^```/.test(line) || /^#{1,4}\s/.test(line)) {
          if (/^#{1,4}\s/.test(line)) break;
          continue;
        }
        const cleaned = cleanInline(line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, ""));
        if (!cleaned || isTechnicalIdentifier(cleaned)) continue;
        collected.push(cleaned);
        chars += cleaned.length;
      }
      if (collected.length) return collected.join(" ");
    }
  }
  return "";
}

function sourceTextSample(sources: SourceDocument[], maxChars = 3000): string {
  let sample = "";
  for (const source of sources) {
    sample += `\n${source.content.slice(0, 800)}`;
    if (sample.length >= maxChars) break;
  }
  return sample.slice(0, maxChars);
}

function isVietnameseCorpus(sources: SourceDocument[]): boolean {
  const sample = sourceTextSample(sources);
  return (sample.match(/[\u00C0-\u1EF9]/g) || []).length > 3;
}

const VI_SETUP_HINT = /cài đặt|môi trường|yêu cầu|chuẩn bị|hướng dẫn|bắt đầu/i;
const VI_EVAL_HINT = /đánh giá|kiểm tra|nộp bài|tiêu chí|kết quả|chấm điểm/i;

function evidenceKinds(sources: SourceDocument[]): { setup: boolean; evaluation: boolean } {
  let setup = false;
  let evaluation = false;
  for (const source of sources) {
    const haystack = `${source.path} ${source.headings.join(" ")}`;
    if (setupScore({ name: source.name, path: source.path, headings: source.headings }) > 0 || VI_SETUP_HINT.test(haystack)) {
      setup = true;
    }
    if (/eval|\btests?\b|checkpoint|success|submission|deliver|verification/i.test(haystack) || VI_EVAL_HINT.test(haystack)) {
      evaluation = true;
    }
    if (setup && evaluation) break;
  }
  return { setup, evaluation };
}

/**
 * Grounded synthesis when no explicit goal section exists: topics come from
 * source H1s, the sentence frame from corpus language, and the coverage
 * clause only from detected setup/evaluation evidence. Never invents topics.
 */
export function synthesizeGoalFromSources(sources: SourceDocument[]): string {
  const topics: string[] = [];
  let chars = 0;
  for (const source of sources) {
    for (const line of source.content.split("\n")) {
      const match = line.match(/^#\s+(.+?)\s*$/);
      if (!match) continue;
      const topic = cleanInline(match[1]);
      if (!topic || isTechnicalIdentifier(topic) || topics.includes(topic)) continue;
      topics.push(topic);
      chars += topic.length;
      if (topics.length >= 3 || chars >= 160) break;
    }
    if (topics.length >= 3) break;
  }
  if (!topics.length) return "";
  const { setup, evaluation } = evidenceKinds(sources);
  if (isVietnameseCorpus(sources)) {
    const extras: string[] = [];
    if (setup) extras.push("phần chuẩn bị môi trường");
    if (evaluation) extras.push("phần đánh giá");
    return `Hiểu ${topics.join("; ")} thông qua các bài thực hành trong tài liệu lab.` +
      (extras.length ? ` Bao gồm ${extras.join(" và ")} theo tài liệu.` : "");
  }
  const extras: string[] = [];
  if (setup) extras.push("environment setup");
  if (evaluation) extras.push("evaluation");
  return `Understand ${topics.join("; ")} through the hands-on tasks in the provided lab materials.` +
    (extras.length ? ` Covers the documented ${extras.join(" and ")}.` : "");
}

function sameText(a: string, b: string): boolean {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s\u00C0-\u1EF9]/g, " ").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

/**
 * Short step purpose for the Current Step card: the step's own goal when it
 * adds meaning beyond the title, otherwise the primary action/detail text.
 * Never invents; returns "" when nothing usable exists (UI hides it).
 */
export function deriveStepGoal(step: Pick<WorkflowStep, "title" | "goal" | "whatToDo" | "howToDoIt">): string {
  const goal = step.goal.trim();
  if (goal && !sameText(goal, step.title)) return goal;
  const fallback = [...step.whatToDo, ...step.howToDoIt].map((entry) => entry.trim()).find((entry) => entry && !sameText(entry, step.title));
  if (!fallback) return "";
  return fallback.length > 160 ? `${fallback.slice(0, 157).trim()}…` : fallback;
}

/**
 * Title priority: explicit valid title → source H1 → humanized slug →
 * generic. Repo slugs/paths never pass through raw.
 */
export function resolveWorkflowTitle(input: { parsedTitle?: unknown; labTitle?: string; sources: SourceDocument[] }): string {
  const parsed = asText(input.parsedTitle);
  if (parsed && !isTechnicalIdentifier(parsed)) return parsed;
  const h1 = firstH1(input.sources);
  if (h1) return h1;
  const rawLabTitle = (input.labTitle || "").trim();
  if (rawLabTitle && !isTechnicalIdentifier(rawLabTitle)) return rawLabTitle;
  const humanized = rawLabTitle ? humanizeSlugLike(rawLabTitle) : "";
  if (humanized && !isTechnicalIdentifier(humanized)) return humanized;
  return FALLBACK_TITLE;
}

/**
 * Goal priority: explicit valid goal → source-grounded extraction →
 * grounded synthesis → neutral fallback. Repository slugs, paths, URLs
 * and filenames are rejected and never surface as the goal.
 */
export function resolveWorkflowGoal(input: { parsedGoal?: unknown; sources: SourceDocument[] }): string {
  const parsed = asText(input.parsedGoal);
  if (parsed && !isTechnicalIdentifier(parsed)) return parsed;
  return extractGoalFromSources(input.sources) || synthesizeGoalFromSources(input.sources) || NEUTRAL_GOAL;
}
