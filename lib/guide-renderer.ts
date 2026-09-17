import type { GeneratedGuide } from "./schemas";

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "_Không có thông tin trong tài liệu._";
}

function sourcedList(items: { content: string; sources: string[] }[]) {
  return items.length
    ? items.map((item) => `- ${item.content}\n  Nguồn: ${item.sources.join(", ")}`).join("\n")
    : "_Không có thông tin trong tài liệu._";
}

function codeBlock(command: string) {
  return `\`\`\`bash\n${command}\n\`\`\``;
}

export function renderGuideMarkdown(guide: GeneratedGuide) {
  const steps = guide.steps
    .sort((a, b) => a.order - b.order)
    .map((step) => {
      const commands = step.commands.length
        ? step.commands
            .map((command) =>
              [command.description ? `- ${command.description}` : undefined, codeBlock(command.command)]
                .filter(Boolean)
                .join("\n")
            )
            .join("\n\n")
        : "_Không có lệnh trong tài liệu._";

      return `### Bước ${step.order}: ${step.title}

**Mục đích**

${step.purpose || "_Không có thông tin trong tài liệu._"}

**Cách thực hiện**

${list(step.instructions)}

**Lệnh**

${commands}

**Kết quả mong đợi**

${step.expectedResult || "_Không có thông tin trong tài liệu._"}

**Nguồn**

${list(step.sources)}`;
    })
    .join("\n\n");

  const commonErrors = guide.commonErrors.length
    ? guide.commonErrors
        .map(
          (error) =>
            `- ${error.problem}${error.suggestion ? `\n  Gợi ý: ${error.suggestion}` : ""}\n  Nguồn: ${error.sources.join(", ")}`
        )
        .join("\n")
    : "_Không có thông tin trong tài liệu._";

  const conflicts = guide.conflicts.length
    ? guide.conflicts
        .map((conflict) => `- ${conflict.description}\n  Nguồn: ${conflict.sources.join(", ")}`)
        .join("\n")
    : "_Không phát hiện nội dung chưa thống nhất trong tài liệu được cung cấp._";

  return `# ${guide.title || "Hướng dẫn thực hiện bài lab"}

## 1. Tổng quan

${guide.overview || "_Không có thông tin trong tài liệu._"}

## 2. Mục tiêu và kết quả cần đạt

${list(guide.objectives)}

## 3. Yêu cầu chuẩn bị

${sourcedList(guide.prerequisites)}

## 4. Các bước thực hiện

${steps || "_Không có thông tin trong tài liệu._"}

## 5. Yêu cầu hoàn thành

${sourcedList(guide.completionRequirements)}

## 6. Gợi ý

${sourcedList(guide.suggestions)}

## 7. Lỗi thường gặp

${commonErrors}

## 8. Nội dung chưa thống nhất

${conflicts}

## 9. Nguồn tài liệu

${list(guide.sources)}`;
}
