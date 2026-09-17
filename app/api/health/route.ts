import { checkConfiguredModelAvailability, getAIProviderStatus } from "@/lib/ai/client";
import { failure, success } from "@/lib/shared/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const status = getAIProviderStatus();
    if (new URL(request.url).searchParams.get("check") !== "models") return success(status);
    return success({ ...status, modelAvailability: await checkConfiguredModelAvailability() });
  } catch (error) {
    return failure(error);
  }
}
