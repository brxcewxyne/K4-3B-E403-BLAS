import { describe, expect, it } from "vitest";
import { WORKFLOW_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildLocalFallbackWorkflow, MAX_FALLBACK_STEPS } from "@/lib/workflow/fallback";
import type { SourceDocument } from "@/lib/shared/types";

function doc(path: string, content: string, index: number): SourceDocument {
  return {
    id: `source-${index}`,
    name: path.split("/").pop() || path,
    path,
    content,
    type: "markdown",
    headings: [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1])
  };
}

const README = `# Lab

## Setup

1. Create a Python virtual environment:

\`\`\`
python -m venv .venv
\`\`\`

2. Install dependencies:

\`\`\`
pip install -r requirements.txt
\`\`\`

## Run

Run:

\`\`\`
python main.py
\`\`\`

## Evaluation

Verify the test output.
`;

describe("local grounded fallback", () => {
  it("builds environment, install, run and evaluation steps with citations (TEST 21)", () => {
    const startedAt = Date.now();
    const workflow = buildLocalFallbackWorkflow([doc("README.md", README, 0)], "owner/lab");
    const durationMs = Date.now() - startedAt;
    // Source H1 wins over the repo slug for the human-readable title.
    const text = workflow.steps.map((step) => `${step.title} ${step.whatToDo.join(" ")} ${step.howToDoIt.join(" ")} ${step.successCriteria.join(" ")}`).join("\n");
    expect(workflow.title).toBe("Lab");
    expect(text).toMatch(/venv|environment/i);
    expect(text).toContain("pip install -r requirements.txt");
    expect(text).toContain("python main.py");
    expect(text).toMatch(/verif/i);
    for (const step of workflow.steps) {
      expect(step.sources.length).toBeGreaterThan(0);
      expect(step.sources[0].sourceId).toBe("source-0");
    }
    // Setup evidence precedes execution.
    const firstEnv = workflow.steps.findIndex((step) => /venv|environment|install|dependencies/i.test(`${step.title} ${step.whatToDo.join(" ")}`));
    const runStep = workflow.steps.findIndex((step) => /python main\.py/i.test(step.howToDoIt.join(" ")));
    expect(firstEnv).toBeGreaterThanOrEqual(0);
    expect(runStep).toBeGreaterThanOrEqual(0);
    expect(firstEnv).toBeLessThan(runStep);
    expect(durationMs).toBeLessThan(2000);
  });

  it("uses evidence across nested files, not only README (TEST 22)", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("README.md", "# Lab\n\n## Overview\n\nCourse lab about agents.", 0),
      doc("docs/setup.md", "# Setup\n\n## Install\n\nRun npm install to fetch packages.", 1),
      doc("labs/checkpoint1.md", "# Checkpoint 1\n\n- [ ] Submit the trace file", 2),
      doc("labs/checkpoint2.md", "# Checkpoint 2\n\n- [ ] Record the final score", 3)
    ]);
    const paths = new Set(workflow.steps.flatMap((step) => step.sources.map((citation) => citation.sourceId)));
    expect(paths.has("source-0")).toBe(false);
    expect(paths).toEqual(new Set(["source-1", "source-2", "source-3"]));
    expect(workflow.steps.map((step) => step.title).join(" ")).toMatch(/install/i);
    const details = workflow.steps.flatMap((step) => [...step.whatToDo, ...step.howToDoIt, ...step.successCriteria]).join(" ");
    expect(details).toMatch(/trace/i);
    expect(details).toMatch(/score/i);
  });

  it("merges duplicate instructions into one step with both references (TEST 23)", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("README.md", "# Lab\n\n## Setup\n\n- Install dependencies.", 0),
      doc("docs/setup.md", "# Setup\n\n- Install dependencies.", 1)
    ]);
    const installSteps = workflow.steps.filter((step) => /install dependencies/i.test(`${step.title} ${step.whatToDo.join(" ")}`));
    expect(installSteps).toHaveLength(1);
    expect(installSteps[0].sources.map((citation) => citation.sourceId).sort()).toEqual(["source-0", "source-1"]);
  });

  it("never invents deployment or venv steps without evidence (TEST 24)", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("README.md", "# Lab\n\n## Run\n\nRun python main.py to start.", 0)
    ]);
    const text = workflow.steps.map((step) => `${step.title} ${step.whatToDo.join(" ")} ${step.howToDoIt.join(" ")}`).join("\n");
    expect(text).not.toMatch(/deploy/i);
    expect(text).not.toMatch(/venv/i);
    expect(text).not.toMatch(/recommended/i);
    expect(text).toContain("python main.py");
  });

  it("caps steps with sequential ids and orders", () => {
    const sources = Array.from({ length: 30 }, (_, index) =>
      doc(`docs/part-${index}.md`, `# Part ${index}\n\n- Action item number ${index} for the checklist today.`, index)
    );
    const workflow = buildLocalFallbackWorkflow(sources);
    expect(workflow.steps.length).toBeLessThanOrEqual(MAX_FALLBACK_STEPS);
    expect(workflow.steps.map((step) => step.order)).toEqual(workflow.steps.map((_, index) => index + 1));
    expect(new Set(workflow.steps.map((step) => step.id)).size).toBe(workflow.steps.length);
  });

  it("returns no steps when sources carry no actionable evidence", () => {
    expect(buildLocalFallbackWorkflow([]).steps).toEqual([]);
  });
});

describe("step granularity", () => {
  it("folds keyword bullets into one parent step (fixture A)", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("tools.md", "## Tool testing\n\n- Financial keywords\n- Weather keywords\n- Other keywords", 0)
    ]);
    expect(workflow.steps).toHaveLength(1);
    const details = workflow.steps[0].whatToDo.join(" ");
    expect(details).toMatch(/financial/i);
    expect(details).toMatch(/weather/i);
    expect(details).toMatch(/other keywords/i);
  });

  it("folds short sequential reads into one review step (fixture B)", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("README.md", "## Read materials\n\n1. Read system prompt\n2. Read tool schema A\n3. Read tool schema B", 0)
    ]);
    expect(workflow.steps).toHaveLength(1);
    const details = workflow.steps[0].whatToDo.join(" ");
    expect(details).toContain("Read system prompt");
    expect(details).toContain("Read tool schema A");
    expect(details).toContain("Read tool schema B");
  });

  it("merges near-duplicate micro-steps while keeping both citations", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("a.md", "## Test routing A\n\n- Verify the financial keyword routing path works end to end", 0),
      doc("b.md", "## Test routing B\n\n- Verify the weather keyword routing path works end to end", 1)
    ]);
    expect(workflow.steps).toHaveLength(1);
    expect(workflow.steps[0].sources.map((citation) => citation.sourceId).sort()).toEqual(["source-0", "source-1"]);
    const details = workflow.steps[0].whatToDo.join(" ");
    expect(details).toMatch(/financial/i);
    expect(details).toMatch(/weather/i);
  });

  it("keeps numbered phases distinct", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("a.md", "## Checkpoint 1\n\n- [ ] Submit the trace file", 0),
      doc("b.md", "## Checkpoint 2\n\n- [ ] Record the final score", 1)
    ]);
    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps.map((step) => step.title)).toEqual(["Checkpoint 1", "Checkpoint 2"]);
  });

  it("keeps distinct setup phases separate", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("a.md", "## Setup A\n\n- Install the backend dependencies now please", 0),
      doc("b.md", "## Setup B\n\n- Install the frontend dependencies now please", 1)
    ]);
    expect(workflow.steps).toHaveLength(2);
  });

  it("keeps short ordered setup items inside one phase step", () => {
    const workflow = buildLocalFallbackWorkflow([
      doc("README.md", "## Setup\n\n1. Create a Python virtual environment\n2. Install dependencies", 0)
    ]);
    expect(workflow.steps).toHaveLength(1);
    expect(workflow.steps[0].title).toBe("Setup");
  });

  it("instructs the AI model toward concise major stages", () => {
    expect(WORKFLOW_SYSTEM_PROMPT).toContain("5–10 major steps");
    expect(WORKFLOW_SYSTEM_PROMPT).toContain("Do not create a separate workflow step for every bullet");
  });
});
