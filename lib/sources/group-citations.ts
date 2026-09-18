import type { Citation } from "../shared/types";

export type GroupedSourceSection = {
  /** Stable dedupe key: group key + normalized section. */
  key: string;
  /** Section/heading label; empty when the citation has no section. */
  section: string;
  /** First citation seen for this section — retains excerpt for reader navigation. */
  citation: Citation;
};

export type GroupedSource = {
  /** Stable group key derived from source identity (never the display filename alone). */
  key: string;
  sourceId: string;
  file: string;
  sections: GroupedSourceSection[];
};

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

/**
 * Group citations by stable source identity so each file renders once with its
 * sections underneath. Groups key on `sourceId` (falling back to the normalized
 * file value), so `/README.md` and `/docs/README.md` never merge. Sections
 * dedupe on normalized `sourceId + section`, keeping the first excerpt seen.
 * First-appearance order is preserved throughout.
 */
export function groupCitationsBySource(citations: Citation[]): GroupedSource[] {
  const groups: GroupedSource[] = [];
  const byKey = new Map<string, GroupedSource>();
  for (const citation of citations) {
    const identity = citation.sourceId?.trim() ? citation.sourceId : citation.file;
    const key = `source:${normalizeIdentity(identity)}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, sourceId: citation.sourceId, file: citation.file, sections: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    const sectionLabel = citation.section?.trim() || "";
    const sectionKey = `${key}#${normalizeIdentity(sectionLabel)}`;
    if (!group.sections.some((entry) => entry.key === sectionKey)) {
      group.sections.push({ key: sectionKey, section: sectionLabel, citation });
    }
  }
  return groups;
}

/** Count of unique files (not citation fragments). */
export function countUniqueSources(citations: Citation[]): number {
  return groupCitationsBySource(citations).length;
}
