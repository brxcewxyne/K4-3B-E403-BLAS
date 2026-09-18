import { chunkSources, type SourceChunk } from "../sources/chunks";
import { hashString } from "../logging/redact";
import type { SourceDocument } from "../shared/types";

export const WORKFLOW_CONTEXT_CHAR_BUDGET = 56_000;
export const WORKFLOW_RETRY_CHAR_BUDGET = 24_000;

const PRIORITY_TERMS = [
  "readme",
  "guide",
  "lab",
  "checkpoint",
  "setup",
  "install",
  "installation",
  "prerequisite",
  "requirements",
  "environment",
  "dependency",
  "dependencies",
  "configuration",
  "instruction",
  "assignment",
  "requirement",
  "evaluation",
  "objective",
  "deliverable",
  "usage"
];

/**
 * Deterministic setup-evidence signals (Q pre-pass): filename + heading
 * matches that indicate environment/installation content. Used to guarantee
 * setup docs reach the workflow context even when general ranking would cut
 * them — reduction happens at chunk level, never by silently dropping files.
 */
const SETUP_TERMS = [
  "setup",
  "install",
  "installation",
  "prerequisite",
  "requirements",
  "environment",
  "venv",
  "virtualenv",
  "virtual environment",
  "conda",
  "dependencies",
  "dependency",
  "configuration",
  "dotenv",
  "getting started",
  "python",
  "pip",
  "npm",
  "docker"
];
const SETUP_RESERVE_SLOTS = 2;
const SAFE_EXCLUSIONS = /(?:^|[/_.-])(license|changelog|code[-_ ]of[-_ ]conduct|contributing|security)(?:[/_.-]|$)/i;

type ContextMode = "normal" | "compact";

export type WorkflowContext = {
  payload: string;
  characters: number;
  chunks: number;
  sourceNames: string[];
  /** IDs of documents represented in the payload (for sourcesAvailable vs represented logging). */
  selectedSourceIds: string[];
  /** Setup-evidence documents guaranteed a slot (sourceId + path only). */
  setupEvidence: Array<{ sourceId: string; path: string }>;
  inputSourceCount: number;
  inputCharacters: number;
};

/** Lightweight setup-evidence score from filename + headings (no LLM call). Exported for regression tests. */
export function setupScore(source: Pick<SourceDocument, "name" | "path" | "headings">): number {
  const haystack = `${source.name} ${source.path} ${source.headings.join(" ")}`.toLowerCase();
  const hits = SETUP_TERMS.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
  const filenameHits = SETUP_TERMS.reduce((count, term) => count + (`${source.name} ${source.path}`.toLowerCase().includes(term) ? 1 : 0), 0);
  return filenameHits * 12 + hits * 4;
}

function relevance(value: string) {
  const normalized = value.toLowerCase();
  return PRIORITY_TERMS.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

function sourceScore(source: SourceDocument) {
  const filenameScore = relevance(`${source.name} ${source.path}`);
  const headingScore = relevance(source.headings.join(" "));
  return filenameScore * 12 + headingScore * 4 + (/readme/i.test(source.name) ? 16 : 0);
}

function chunkBlock(chunk: SourceChunk, content: string) {
  return `===== SOURCE id=${chunk.sourceId} file=${chunk.file} path=${chunk.path} section=${chunk.section} =====\n${content}`;
}

export function prepareWorkflowContext(sources: SourceDocument[], mode: ContextMode = "normal"): WorkflowContext {
  const nonEmpty = sources.filter((source) => source.content.trim().length > 0);
  const relevant = nonEmpty.filter((source) => !SAFE_EXCLUSIONS.test(source.path) || sourceScore(source) > 0);
  const ranked = relevant
    .map((source, index) => ({ source, index, score: sourceScore(source) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const preferred = mode === "compact" && ranked.some((item) => item.score > 0)
    ? ranked.filter((item) => item.score > 0)
    : ranked;
  const documentLimit = mode === "compact" ? 4 : 10;
  const chunkLimit = mode === "compact" ? 6 : 12;
  const budget = mode === "compact" ? WORKFLOW_RETRY_CHAR_BUDGET : WORKFLOW_CONTEXT_CHAR_BUDGET;
  const reserveSlots = Math.min(SETUP_RESERVE_SLOTS, documentLimit);
  const baseSelection = preferred.slice(0, documentLimit);
  const baseIds = new Set(baseSelection.map(({ source }) => source.id));
  // Guarantee: top setup-evidence documents keep a slot even when general
  // ranking would cut them. Lowest-ranked general picks make room instead.
  const setupPicks = preferred
    .filter(({ source }) => !baseIds.has(source.id) && setupScore(source) > 0)
    .sort((a, b) => setupScore(b.source) - setupScore(a.source) || a.index - b.index)
    .slice(0, reserveSlots);
  const selectedDocuments = setupPicks.length
    ? [...baseSelection.slice(0, Math.max(0, documentLimit - setupPicks.length)), ...setupPicks]
    : baseSelection;
  const setupEvidence = selectedDocuments
    .filter(({ source }) => setupScore(source) > 0)
    .map(({ source }) => ({ sourceId: source.id, path: source.path }));
  const documentScores = new Map(selectedDocuments.map(({ source, score }) => [source.id, score]));
  // Chunk-level dedupe: identical (sourceId + normalized section + content hash)
  // chunks are sent once. Files themselves are never removed from inventory.
  const seenChunks = new Set<string>();
  const chunks = chunkSources(selectedDocuments.map(({ source }) => source))
    .map((chunk, index) => ({ chunk, index, score: (documentScores.get(chunk.sourceId) || 0) * 100 + relevance(chunk.section) * 10 }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter(({ chunk }) => {
      const key = `${chunk.sourceId}::${chunk.section.trim().toLowerCase()}::${hashString(chunk.content)}`;
      if (seenChunks.has(key)) return false;
      seenChunks.add(key);
      return true;
    })
    .slice(0, chunkLimit);

  const blocks: string[] = [];
  const includedNames = new Set<string>();
  const includedIds = new Set<string>();
  let characters = 0;
  for (const { chunk } of chunks) {
    const header = chunkBlock(chunk, "");
    const separatorLength = blocks.length ? 2 : 0;
    const remaining = budget - characters - separatorLength - header.length;
    if (remaining < 200) break;
    const block = chunkBlock(chunk, chunk.content.slice(0, remaining));
    blocks.push(block);
    characters += separatorLength + block.length;
    includedNames.add(chunk.file);
    includedIds.add(chunk.sourceId);
  }

  return {
    payload: blocks.join("\n\n"),
    characters,
    chunks: blocks.length,
    sourceNames: [...includedNames],
    selectedSourceIds: [...includedIds],
    setupEvidence,
    inputSourceCount: sources.length,
    inputCharacters: sources.reduce((sum, source) => sum + source.content.length, 0)
  };
}
