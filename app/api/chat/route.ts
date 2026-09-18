import { answerGroundedQuestion } from "@/lib/chat/grounded-chat";
import { failure, success, AppError } from "@/lib/shared/api";
import { sourceArraySchema } from "@/lib/shared/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  sources: sourceArraySchema,
  sessionId: z.string().uuid().optional(),
  progress: z.object({
    currentStepId: z.string().nullable(),
    completedStepIds: z.array(z.string()).max(200),
    stepHistory: z.array(z.string()).max(500)
  }).optional(),
  workflowContext: z.object({
    goal: z.string().max(3000),
    currentStep: z.object({ id: z.string(), order: z.number(), title: z.string(), goal: z.string().max(2000), requirements: z.array(z.string()).max(50), whatToDo: z.array(z.string()).max(50), howToDoIt: z.array(z.string()).max(50), expectedOutput: z.array(z.string()).max(50), successCriteria: z.array(z.string()).max(50), warnings: z.array(z.string()).max(50) }).optional(),
    previousStep: z.object({ id: z.string(), order: z.number(), title: z.string(), goal: z.string().max(2000), requirements: z.array(z.string()).max(50), whatToDo: z.array(z.string()).max(50), howToDoIt: z.array(z.string()).max(50), expectedOutput: z.array(z.string()).max(50), successCriteria: z.array(z.string()).max(50), warnings: z.array(z.string()).max(50) }).optional(),
    nextStep: z.object({ id: z.string(), order: z.number(), title: z.string(), goal: z.string().max(2000), requirements: z.array(z.string()).max(50), whatToDo: z.array(z.string()).max(50), howToDoIt: z.array(z.string()).max(50), expectedOutput: z.array(z.string()).max(50), successCriteria: z.array(z.string()).max(50), warnings: z.array(z.string()).max(50) }).optional(),
    completedSteps: z.array(z.object({ id: z.string(), order: z.number(), title: z.string() })).max(200)
  }).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(10).optional()
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError("INVALID_CHAT_REQUEST", parsed.error.issues[0]?.message || "Chat request is invalid.");
    return success(await answerGroundedQuestion(parsed.data));
  } catch (error) { return failure(error); }
}
