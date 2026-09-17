import { z } from "zod";

export const githubInputSchema = z.object({
  repositoryUrl: z.string().url(),
  branch: z.string().trim().min(1).max(120).default("main"),
  subfolder: z.string().trim().max(500).default("/")
});

export const chatInputSchema = z.object({
  guideId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  message: z.string().trim().min(1).max(4000)
});

export const guideItemSchema = z.object({
  content: z.string(),
  sources: z.array(z.string())
});

export const guideStepSchema = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  purpose: z.string().optional(),
  instructions: z.array(z.string()),
  commands: z.array(
    z.object({
      command: z.string(),
      description: z.string().optional()
    })
  ),
  expectedResult: z.string().optional(),
  sources: z.array(z.string())
});

export const generatedGuideSchema = z.object({
  title: z.string(),
  overview: z.string(),
  objectives: z.array(z.string()),
  prerequisites: z.array(guideItemSchema),
  steps: z.array(guideStepSchema),
  completionRequirements: z.array(guideItemSchema),
  suggestions: z.array(guideItemSchema),
  commonErrors: z.array(
    z.object({
      problem: z.string(),
      suggestion: z.string().optional(),
      sources: z.array(z.string())
    })
  ),
  conflicts: z.array(
    z.object({
      description: z.string(),
      sources: z.array(z.string())
    })
  ),
  sources: z.array(z.string())
});

export const sourceSummarySchema = z.object({
  sourcePath: z.string(),
  overview: z.string(),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  requiredTasks: z.array(z.string()),
  suggestedTasks: z.array(z.string()),
  commands: z.array(
    z.object({
      command: z.string(),
      purpose: z.string().optional()
    })
  ),
  expectedResults: z.array(z.string()),
  commonErrors: z.array(z.string()),
  possibleConflicts: z.array(z.string())
});

export const chatAnswerSchema = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      file: z.string(),
      section: z.string()
    })
  )
});

export type GeneratedGuide = z.infer<typeof generatedGuideSchema>;
export type ChatAnswer = z.infer<typeof chatAnswerSchema>;
