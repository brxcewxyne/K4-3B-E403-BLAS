import { extractWorkflow } from "@/lib/workflow/extract";
import { failure, success, AppError } from "@/lib/shared/api";
import { sourceArraySchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sources?: unknown };
    const parsed = sourceArraySchema.safeParse(body.sources);
    if (!parsed.success) throw new AppError("INVALID_SOURCES", parsed.error.issues[0]?.message || "Sources are invalid.");
    return success({ workflow: await extractWorkflow(parsed.data) });
  } catch (error) { return failure(error); }
}
