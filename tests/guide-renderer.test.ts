import { describe, expect, it } from "vitest";
import { renderGuideMarkdown } from "@/lib/guide-renderer";
import type { GeneratedGuide } from "@/lib/schemas";

describe("renderGuideMarkdown", () => {
  it("renders the fixed LAB_GUIDE.md structure and preserves commands", () => {
    const guide: GeneratedGuide = {
      title: "Lab thử nghiệm",
      overview: "Tổng quan",
      objectives: ["Hoàn thành API"],
      prerequisites: [{ content: "Node.js 22", sources: ["README.md"] }],
      steps: [
        {
          order: 1,
          title: "Cài thư viện",
          purpose: "Chuẩn bị môi trường",
          instructions: ["Cài dependencies"],
          commands: [{ command: "npm install", description: "Cài package" }],
          expectedResult: "Có node_modules",
          sources: ["README.md"]
        }
      ],
      completionRequirements: [{ content: "App chạy được", sources: ["README.md"] }],
      suggestions: [],
      commonErrors: [],
      conflicts: [],
      sources: ["README.md"]
    };

    const markdown = renderGuideMarkdown(guide);

    expect(markdown).toContain("# Lab thử nghiệm");
    expect(markdown).toContain("## 4. Các bước thực hiện");
    expect(markdown).toContain("```bash\nnpm install\n```");
    expect(markdown).toContain("Nguồn: README.md");
  });
});
