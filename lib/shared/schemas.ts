import { z } from "zod";

export const citationSchema = z.object({
  sourceId: z.string().min(1),
  file: z.string().min(1),
  section: z.string().min(1),
  excerpt: z.string().min(1).max(500)
});

export const sourceDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(300),
  path: z.string().min(1).max(600),
  content: z.string().min(1).max(1_000_000),
  type: z.enum(["markdown", "mdx"]),
  repository: z.string().max(500).optional(),
  headings: z.array(z.string().max(300)).max(200)
});

export const workflowStepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  goal: z.string().default(""),
  requirements: z.array(z.string()).default([]),
  whatToDo: z.array(z.string()).default([]),
  howToDoIt: z.array(z.string()).default([]),
  expectedOutput: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  sources: z.array(citationSchema).default([]),
  // Legacy pre-synthesis fields — accepted for backward compatibility.
  description: z.string().optional(),
  requiredActions: z.array(z.string()).optional(),
  hints: z.array(z.string()).optional()
});

export const labWorkflowSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  prerequisites: z.array(z.string()),
  steps: z.array(workflowStepSchema).min(1).max(40),
  checkpoints: z.array(z.object({ title: z.string(), requirements: z.array(z.string()), sources: z.array(citationSchema) })),
  conflicts: z.array(z.object({ description: z.string(), sources: z.array(citationSchema) }))
});

export const chatAnswerSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(citationSchema).max(8)
});

export const sourceArraySchema = z.array(sourceDocumentSchema).min(1).max(50).superRefine((sources, context) => {
  const total = sources.reduce((sum, source) => sum + Buffer.byteLength(source.content, "utf8"), 0);
  if (total > 2_000_000) context.addIssue({ code: "custom", message: "Combined Markdown content exceeds 2 MB." });
});
