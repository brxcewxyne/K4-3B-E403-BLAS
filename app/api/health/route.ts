import { getAIProviderStatus } from "@/lib/ai/client";
import { success } from "@/lib/shared/api";

export const runtime = "nodejs";

export function GET() {
  return success(getAIProviderStatus());
}
