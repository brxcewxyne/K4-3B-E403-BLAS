export const WORKFLOW_PRIMARY_TIMEOUT_MS = 22_000;
export const WORKFLOW_FALLBACK_TIMEOUT_MS = 18_000;
export const WORKFLOW_MAX_PROVIDER_MS = WORKFLOW_PRIMARY_TIMEOUT_MS + WORKFLOW_FALLBACK_TIMEOUT_MS;

export type WorkflowAttempt = { mode: "normal" | "compact"; timeoutMs: number; model: string | undefined };

/**
 * Pure attempt planner: primary model first, then a genuinely different
 * fallback model on a smaller budget. With no usable fallback configured
 * there is exactly one attempt — never a blind same-model retry that would
 * burn the Vercel route budget twice. An unconfigured primary is passed
 * through so the provider layer raises AI_NOT_CONFIGURED truthfully.
 */
export function planWorkflowAttempts(primaryModel: string | undefined, fallbackModel: string | null): WorkflowAttempt[] {
  const attempts: WorkflowAttempt[] = [{ mode: "normal", timeoutMs: WORKFLOW_PRIMARY_TIMEOUT_MS, model: primaryModel }];
  const fallback = fallbackModel?.trim() || null;
  if (fallback && fallback !== primaryModel) {
    attempts.push({ mode: "compact", timeoutMs: WORKFLOW_FALLBACK_TIMEOUT_MS, model: fallback });
  }
  return attempts;
}
