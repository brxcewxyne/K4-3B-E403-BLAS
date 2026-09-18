import { AppError } from "../shared/api";

/**
 * Map a workflow generation failure to a stable, user-safe error code.
 * Auth/rate-limit/provider errors pass through truthfully; an unreadable
 * provider payload becomes WORKFLOW_PARSE_ERROR (never a generic blob).
 */
export function mapWorkflowErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    if (error.code === "AI_MALFORMED_RESPONSE") return "WORKFLOW_PARSE_ERROR";
    return error.code;
  }
  return "UNKNOWN";
}
