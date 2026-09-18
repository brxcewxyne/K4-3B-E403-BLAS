import type { Citation, LabWorkflow, SourceDocument, WorkflowStep } from "../shared/types";
import { dedupeKey } from "./normalize";

export const MAX_FALLBACK_STEPS = 24;
const TITLE_MAX_LENGTH = 100;

type SectionKind = "setup" | "procedure" | "evaluation" | "other";

const SETUP_HEADING = /setup|set up|getting started|prerequis|install|environment|requirements?|dependenc|configur|\.env|api key|quickstart|venv|conda|docker|\bnpm\b|\bpip\b/i;
const PROCEDURE_HEADING = /procedure|guide|tutorial|walkthrough|usage|how to|implement|baseline|\bstep\b|\btask\b|\brun\b|\bdemo\b|\bexample\b/i;
const EVAL_HEADING = /eval|\btests?\b|verif|validat|checkpoint|success|submission|deliver|acceptance|\bresults?\b|criteria|\breview\b|grading|complet/i;
const CHECK_KEYWORDS = /verif|check|confirm|ensure|\btests?\b|pass\b|criteria|expect|success|done when|✓/i;
const WARN_KEYWORDS = /warn|caution|\bnote\b|important|don't|do not|avoid|\bfail\b|\berror\b|troubleshoot|must not|never/i;

type SectionItem = { ordered: boolean; checklist: boolean; text: string };

/**
 * Items that read as examples, keyword sets, or test inputs rather than
 * independently completable tasks. They belong inside a parent step's
 * fields, never as top-level steps of their own.
 */
const EXAMPLE_ITEM = /^(example|e\.g\.?|eg|for example|such as|like|note|hint|tip)\b|\bkeywords?\b|\btest (case|input)s?\b|\bsamples?\b/i;
const MIN_SPLIT_ITEM_LENGTH = 30;
const MAX_SPLIT_ITEMS = 3;

/**
 * List items become top-level steps ONLY when the section defines a short
 * sequence of substantial, independently completable tasks. Otherwise the
 * whole section folds into ONE phase step and items live in its fields.
 */
export function shouldSplitItems(section: Pick<ParsedSection, "kind" | "items">): boolean {
  if (section.kind === "other") return false;
  if (section.items.length === 0 || section.items.length > MAX_SPLIT_ITEMS) return false;
  return section.items.every(
    (item) => (item.ordered || item.checklist) && item.text.length >= MIN_SPLIT_ITEM_LENGTH && !EXAMPLE_ITEM.test(item.text)
  );
}

function titleSimilarity(a: string, b: string): number {
  // All tokens count, including numbers: "Checkpoint 1" vs "Checkpoint 2"
  // must stay distinct, while near-identical phrases still merge.
  const tokensA = new Set(dedupeKey(a).split(" ").filter(Boolean));
  const tokensB = new Set(dedupeKey(b).split(" ").filter(Boolean));
  if (!tokensA.size || !tokensB.size) return 0;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  return shared / Math.max(tokensA.size, tokensB.size);
}

type ParsedSection = {
  heading: string;
  kind: SectionKind;
  items: SectionItem[];
  codes: string[];
  prose: string[];
};

function classifyHeading(heading: string): SectionKind {
  if (SETUP_HEADING.test(heading)) return "setup";
  if (EVAL_HEADING.test(heading)) return "evaluation";
  if (PROCEDURE_HEADING.test(heading)) return "procedure";
  return "other";
}

function cleanItemText(text: string): string {
  return text
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= TITLE_MAX_LENGTH) return cleaned;
  const cut = cleaned.slice(0, TITLE_MAX_LENGTH);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > 40 ? cut.slice(0, boundary) : cut).trim()}…`;
}

function parseSections(doc: SourceDocument): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { heading: "", kind: "other", items: [], codes: [], prose: [] };
  let inCode = false;
  let codeLines: string[] = [];
  const flush = () => {
    if (current.heading || current.items.length || current.codes.length || current.prose.length) {
      sections.push(current);
    }
  };
  for (const rawLine of doc.content.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (/^```/.test(line.trim())) {
      if (inCode) {
        const block = codeLines.map((entry) => entry.trim()).filter(Boolean);
        if (block.length) current.codes.push(...block.slice(0, 12));
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      flush();
      const title = heading[2].trim();
      current = { heading: title, kind: classifyHeading(title), items: [], codes: [], prose: [] };
      continue;
    }
    const subHeading = line.match(/^#{4,}\s+(.+?)\s*$/);
    if (subHeading) {
      current.prose.push(subHeading[1].trim());
      continue;
    }
    const item = line.match(/^\s*(?:(\d+)[.)]|[-*])\s+(?:(\[[ xX]\])\s+)?(.+?)\s*$/);
    if (item) {
      const text = cleanItemText(item[3]);
      if (text) current.items.push({ ordered: Boolean(item[1]), checklist: Boolean(item[2]), text });
      continue;
    }
    if (line.trim()) current.prose.push(line.trim());
  }
  flush();
  return sections;
}

function cite(doc: SourceDocument, section: string, excerptSource: string): Citation {
  return {
    sourceId: doc.id,
    file: doc.name,
    section: section || "Document",
    excerpt: excerptSource.replace(/\s+/g, " ").trim().slice(0, 240) || doc.path
  };
}

type Candidate = Omit<WorkflowStep, "id" | "order"> & { sectionKind: SectionKind };

function sectionPhaseStep(doc: SourceDocument, section: ParsedSection): Candidate | null {
  const label = section.heading || "Document";
  if (!section.heading && !section.codes.length && !section.prose.length && !section.items.length) return null;
  if (section.kind === "other" && !section.items.length && !section.codes.length) return null;
  const itemTexts = section.items.map((item) => item.text);
  // Label-only prose (e.g. "Run:") adds nothing next to its code block.
  const prose = section.prose.filter((entry) => section.codes.length === 0 || !/^.{0,40}:$/.test(entry));
  const warnings = prose.filter((entry) => WARN_KEYWORDS.test(entry)).slice(0, 3);
  const success = prose.filter((entry) => !WARN_KEYWORDS.test(entry) && CHECK_KEYWORDS.test(entry)).slice(0, 3);
  const remainder = prose.filter((entry) => !WARN_KEYWORDS.test(entry) && !CHECK_KEYWORDS.test(entry));
  const requirements = section.kind === "setup" ? remainder.slice(0, 4) : [];
  const actions = [...itemTexts, ...(section.kind === "setup" ? [] : remainder.slice(0, 3))];
  if (!actions.length && !section.codes.length && !requirements.length && !success.length && !warnings.length) return null;
  return {
    title: truncateTitle(label === "Document" && itemTexts.length ? itemTexts[0] : label),
    goal: "",
    requirements,
    whatToDo: actions,
    howToDoIt: section.codes.slice(0, 8),
    expectedOutput: [],
    successCriteria: success,
    warnings,
    sources: [cite(doc, label, [...actions, ...section.codes, ...success, ...warnings, ...requirements].join(" ").slice(0, 240) || label)],
    sectionKind: section.kind
  };
}

function buildCandidates(doc: SourceDocument): Candidate[] {
  const candidates: Candidate[] = [];
  for (const section of parseSections(doc)) {
    const label = section.heading || "Document";
    if (shouldSplitItems(section)) {
      // Short sequence of substantial tasks: each item earns a top-level step.
      for (const item of section.items) {
        candidates.push({
          title: truncateTitle(item.text),
          goal: "",
          requirements: [],
          whatToDo: [item.text],
          howToDoIt: section.codes.slice(0, 8),
          expectedOutput: [],
          successCriteria: [],
          warnings: [],
          sources: [cite(doc, label, item.text)],
          sectionKind: section.kind
        });
      }
      continue;
    }
    const phase = sectionPhaseStep(doc, section);
    if (phase) candidates.push(phase);
  }
  return candidates;
}

function mergeField(into: string[], additions: string[]): void {
  for (const item of additions) {
    if (!into.some((entry) => dedupeKey(entry) === dedupeKey(item))) into.push(item);
  }
}

/**
 * Merge duplicate/near-duplicate micro-steps: identical titles always merge;
 * highly similar titles merge unless either step is a setup phase (setup
 * steps stay distinct so environment preparation remains visible).
 */
export function mergeCandidates(candidates: Candidate[]): Candidate[] {
  const merged: Candidate[] = [];
  for (const candidate of candidates) {
    const candidateKey = dedupeKey(candidate.title);
    const existing = merged.find((entry) => {
      if (dedupeKey(entry.title) === candidateKey) return true;
      if (entry.sectionKind === "setup" || candidate.sectionKind === "setup") return false;
      return titleSimilarity(entry.title, candidate.title) >= 0.6;
    });
    if (!existing) {
      merged.push(candidate);
      continue;
    }
    mergeField(existing.requirements, candidate.requirements);
    mergeField(existing.whatToDo, candidate.whatToDo);
    mergeField(existing.howToDoIt, candidate.howToDoIt);
    mergeField(existing.expectedOutput, candidate.expectedOutput);
    mergeField(existing.successCriteria, candidate.successCriteria);
    mergeField(existing.warnings, candidate.warnings);
    for (const citation of candidate.sources) {
      if (!existing.sources.some((entry) => entry.sourceId === citation.sourceId && entry.section === citation.section)) {
        existing.sources.push(citation);
      }
    }
  }
  return merged;
}

/**
 * Deterministic grounded fallback: builds a LabWorkflow purely from the
 * ingested Markdown structure (paths, headings, lists, code, prose).
 * No LLM, no invented content — empty evidence stays empty (UI hides it).
 * Setup-kind sections are ordered first; everything else keeps source order.
 */
export function buildLocalFallbackWorkflow(sources: SourceDocument[], labTitle?: string): LabWorkflow {
  const nonEmpty = sources.filter((source) => source.content.trim().length > 0);
  // Stable order: setup-kind documents first (by evidence, then input order), rest in input order.
  const setupFirst = [...nonEmpty].sort((a, b) => {
    const score = (doc: SourceDocument) => {
      const haystack = `${doc.path} ${doc.headings.join(" ")}`.toLowerCase();
      return /setup|install|prerequis|requirements?|environment|venv|dependenc|configur|\.env/i.test(haystack) ? 0 : 1;
    };
    return score(a) - score(b);
  });

  const candidates: Candidate[] = [];
  for (const doc of setupFirst) {
    candidates.push(...buildCandidates(doc));
  }
  // Same instruction repeated across files becomes one step with all references kept.
  const merged = mergeCandidates(candidates).slice(0, MAX_FALLBACK_STEPS);

  const firstHeading = nonEmpty.flatMap((doc) => doc.headings)[0] || "";
  const steps: WorkflowStep[] = merged.map((candidate, index) => ({
    id: `fb-${index + 1}`,
    order: index + 1,
    title: candidate.title,
    goal: candidate.goal,
    requirements: candidate.requirements,
    whatToDo: candidate.whatToDo,
    howToDoIt: candidate.howToDoIt,
    expectedOutput: candidate.expectedOutput,
    successCriteria: candidate.successCriteria,
    warnings: candidate.warnings,
    sources: candidate.sources
  }));

  return {
    title: labTitle?.trim() || firstHeading || "Lab Workflow",
    goal: "",
    prerequisites: [],
    steps,
    checkpoints: [],
    conflicts: []
  };
}
