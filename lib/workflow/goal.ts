import type { SourceDocument } from "../shared/types";

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
 * neutral fallback. Repository slugs, paths, URLs and filenames are
 * rejected and never surface as the goal.
 */
export function resolveWorkflowGoal(input: { parsedGoal?: unknown; sources: SourceDocument[] }): string {
  const parsed = asText(input.parsedGoal);
  if (parsed && !isTechnicalIdentifier(parsed)) return parsed;
  return extractGoalFromSources(input.sources) || NEUTRAL_GOAL;
}
