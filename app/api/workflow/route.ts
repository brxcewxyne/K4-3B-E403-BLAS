import { extractWorkflow } from "@/lib/workflow/extract";
import { failure, success, AppError } from "@/lib/shared/api";
import { sourceArraySchema } from "@/lib/shared/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  sources: sourceArraySchema,
  sessionId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError("INVALID_WORKFLOW_REQUEST", parsed.error.issues[0]?.message || "Workflow request is invalid.");
    return success({ workflow: await extractWorkflow(parsed.data.sources, parsed.data.sessionId) });
  } catch (error) { return failure(error); }
}
