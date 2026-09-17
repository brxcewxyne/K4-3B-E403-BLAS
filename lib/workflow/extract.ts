import { generateJson } from "../ai/client";
import { WORKFLOW_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk } from "../sources/chunks";
import { AppError } from "../shared/api";
import { labWorkflowSchema } from "../shared/schemas";
import type { Citation, LabWorkflow, SourceDocument } from "../shared/types";

function sourcePayload(sources: SourceDocument[]) {
  return sources.map((source) => `===== SOURCE id=${source.id} file=${source.name} path=${source.path} =====\n${source.content}`).join("\n\n");
}

function sanitizeCitation(citation: Citation, sources: SourceDocument[]): Citation | null {
  const source = sources.find((item) => item.id === citation.sourceId) || sources.find((item) => item.name === citation.file || item.path === citation.file);
  if (!source) return null;
  const chunks = chunkSources([source]);
  const chunk = chunks.find((item) => item.section.toLowerCase() === citation.section.toLowerCase()) || chunks[0];
  const normalizedContent = source.content.replace(/\s+/g, " ");
  const excerpt = normalizedContent.includes(citation.excerpt.replace(/\s+/g, " ")) ? citation.excerpt : excerptFromChunk(chunk);
  if (!excerpt) return null;
  return { sourceId: source.id, file: source.name, section: chunk.section, excerpt };
}

export async function extractWorkflow(sources: SourceDocument[], sessionId?: string): Promise<LabWorkflow> {
  const schema = `{
  "title": "string", "goal": "string", "prerequisites": ["string"],
  "steps": [{
    "id": "step-1", "order": 1, "title": "string", "description": "string",
    "requiredActions": ["string"], "successCriteria": ["string"], "hints": ["string"],
    "sources": [{ "sourceId": "provided id", "file": "provided filename", "section": "heading", "excerpt": "verbatim excerpt" }]
  }],
  "checkpoints": [{ "title": "string", "requirements": ["string"], "sources": [Citation] }],
  "conflicts": [{ "description": "string", "sources": [Citation] }]
}`;
  const result = await generateJson("workflow", WORKFLOW_SYSTEM_PROMPT, `Return JSON matching this schema:\n${schema}\n\n${sourcePayload(sources)}`, sessionId);
  const parsed = labWorkflowSchema.safeParse(result);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    throw new AppError("WORKFLOW_SCHEMA_ERROR", "The AI provider returned a workflow that did not match the required schema.", 502);
  }
  const sanitize = (citations: Citation[]) => citations.map((citation) => sanitizeCitation(citation, sources)).filter((citation): citation is Citation => Boolean(citation));
  return {
    ...parsed.data,
    steps: [...parsed.data.steps].sort((a, b) => a.order - b.order).map((step, index) => ({ ...step, id: step.id || `step-${index + 1}`, order: index + 1, sources: sanitize(step.sources) })),
    checkpoints: parsed.data.checkpoints.map((checkpoint) => ({ ...checkpoint, sources: sanitize(checkpoint.sources) })),
    conflicts: parsed.data.conflicts.map((conflict) => ({ ...conflict, sources: sanitize(conflict.sources) }))
  };
}
