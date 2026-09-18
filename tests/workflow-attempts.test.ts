import { describe, expect, it } from "vitest";
import {
  WORKFLOW_FALLBACK_TIMEOUT_MS,
  WORKFLOW_MAX_PROVIDER_MS,
  WORKFLOW_PRIMARY_TIMEOUT_MS,
  planWorkflowAttempts
} from "@/lib/workflow/attempts";

const PRIMARY = "muse-spark-1.3-contributor";

describe("workflow attempt planning", () => {
  it("uses a single primary attempt when no fallback is configured", () => {
    expect(planWorkflowAttempts(PRIMARY, null)).toEqual([
      { mode: "normal", timeoutMs: WORKFLOW_PRIMARY_TIMEOUT_MS, model: PRIMARY }
    ]);
  });

  it("never blind-retries the same model", () => {
    expect(planWorkflowAttempts(PRIMARY, PRIMARY)).toHaveLength(1);
    expect(planWorkflowAttempts(PRIMARY, `  ${PRIMARY}  `)).toHaveLength(1);
  });

  it("adds a cheaper fallback attempt on a smaller budget", () => {
    const attempts = planWorkflowAttempts(PRIMARY, "fallback-model");
    expect(attempts).toEqual([
      { mode: "normal", timeoutMs: WORKFLOW_PRIMARY_TIMEOUT_MS, model: PRIMARY },
      { mode: "compact", timeoutMs: WORKFLOW_FALLBACK_TIMEOUT_MS, model: "fallback-model" }
    ]);
  });

  it("keeps worst-case provider time safely below the 60s route budget", () => {
    expect(WORKFLOW_PRIMARY_TIMEOUT_MS).toBeLessThanOrEqual(25_000);
    expect(WORKFLOW_FALLBACK_TIMEOUT_MS).toBeLessThanOrEqual(20_000);
    expect(WORKFLOW_MAX_PROVIDER_MS).toBeLessThanOrEqual(45_000);
    const worstCase = planWorkflowAttempts(PRIMARY, "fallback-model").reduce((sum, attempt) => sum + attempt.timeoutMs, 0);
    expect(worstCase).toBeLessThanOrEqual(45_000);
  });
});
