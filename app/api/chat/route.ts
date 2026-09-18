import { answerGroundedQuestion } from "@/lib/chat/grounded-chat";
import { failure, success, AppError } from "@/lib/shared/api";
import { labWorkflowSchema, sourceArraySchema } from "@/lib/shared/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  sources: sourceArraySchema,
  workflow: labWorkflowSchema.optional(),
  sessionId: z.string().uuid().optional(),
  currentStep: z.string().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(10).optional()
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError("INVALID_CHAT_REQUEST", parsed.error.issues[0]?.message || "Chat request is invalid.");
    return success(await answerGroundedQuestion(parsed.data));
  } catch (error) { return failure(error); }
}
