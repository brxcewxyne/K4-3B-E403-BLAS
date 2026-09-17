import type { ChatAnswer, GeneratedGuide } from "./schemas";

export const mockSources = [
  {
    path: "README.md",
    content: `# Containerized Notes API Lab

Mục tiêu của bài lab là xây dựng một Notes API bằng Node.js, chạy bằng Docker Compose và kiểm tra endpoint health.

## Yêu cầu
- Node.js 20+
- Docker Desktop
- Git

## Hoàn thành
API phản hồi tại http://localhost:3000 và GET /health trả về { "status": "ok" }.`
  },
  {
    path: "docs/setup.md",
    content: `# Cài đặt

Sao chép file môi trường bằng lệnh \`cp .env.example .env\`, sau đó cài dependency với \`npm install\`.

Khởi động môi trường phát triển bằng \`docker compose up --build\`.

Nếu cổng 3000 đã được sử dụng, đổi PORT trong file .env.`
  },
  {
    path: "docs/tasks.md",
    content: `# Nhiệm vụ

1. Cài đặt dependency.
2. Tạo container cho ứng dụng Node.js.
3. Khởi động dịch vụ bằng Docker Compose.
4. Gọi endpoint /health và tạo một ghi chú qua POST /api/notes.

Kết quả cần nộp: mã nguồn, Dockerfile và ảnh chụp kết quả kiểm thử.`
  }
];

export const mockGuide: GeneratedGuide = {
  title: "Lab: Xây dựng Notes API với Docker",
  overview:
    "Trong bài lab này, bạn sẽ đóng gói một Notes API viết bằng Node.js vào container, chạy ứng dụng bằng Docker Compose và xác minh các endpoint chính.",
  objectives: [
    "Chạy được ứng dụng Node.js trong Docker container.",
    "Hiểu cách cấu hình biến môi trường với Docker Compose.",
    "Kiểm tra health check và thao tác tạo ghi chú qua REST API."
  ],
  prerequisites: [
    { content: "Cài đặt Node.js phiên bản 20 trở lên.", sources: ["README.md"] },
    { content: "Cài đặt và khởi động Docker Desktop.", sources: ["README.md", "docs/setup.md"] },
    { content: "Bảo đảm cổng 3000 đang khả dụng.", sources: ["docs/setup.md"] }
  ],
  steps: [
    {
      order: 1,
      title: "Chuẩn bị dự án",
      purpose: "Cài dependency và tạo cấu hình môi trường local.",
      instructions: ["Mở terminal tại thư mục gốc của repository.", "Tạo file .env từ cấu hình mẫu."],
      commands: [
        { command: "npm install", description: "Cài đặt dependency của dự án." },
        { command: "cp .env.example .env", description: "Tạo file biến môi trường." }
      ],
      expectedResult: "Thư mục node_modules và file .env được tạo thành công.",
      sources: ["docs/setup.md"]
    },
    {
      order: 2,
      title: "Khởi động bằng Docker Compose",
      purpose: "Build image và chạy API trong container.",
      instructions: ["Build image từ Dockerfile.", "Theo dõi log cho tới khi API báo sẵn sàng."],
      commands: [{ command: "docker compose up --build", description: "Build và chạy toàn bộ dịch vụ." }],
      expectedResult: "API lắng nghe tại http://localhost:3000.",
      sources: ["docs/setup.md", "docs/tasks.md"]
    },
    {
      order: 3,
      title: "Kiểm thử API",
      purpose: "Xác nhận ứng dụng hoạt động và có thể nhận dữ liệu.",
      instructions: ["Kiểm tra health endpoint.", "Gửi một yêu cầu tạo ghi chú mẫu."],
      commands: [
        { command: "curl http://localhost:3000/health", description: "Kiểm tra trạng thái API." },
        {
          command: "curl -X POST http://localhost:3000/api/notes -H \"Content-Type: application/json\" -d '{\"title\":\"Lab note\"}'",
          description: "Tạo ghi chú đầu tiên."
        }
      ],
      expectedResult: "Health endpoint trả về status ok và API tạo ghi chú trả về HTTP 201.",
      sources: ["README.md", "docs/tasks.md"]
    }
  ],
  completionRequirements: [
    { content: "Nộp mã nguồn, Dockerfile và file compose.", sources: ["docs/tasks.md"] },
    { content: "Đính kèm kết quả kiểm thử /health và POST /api/notes.", sources: ["docs/tasks.md"] }
  ],
  suggestions: [
    { content: "Dùng docker compose logs -f api để theo dõi log khi kiểm thử.", sources: ["docs/setup.md"] }
  ],
  commonErrors: [
    {
      problem: "Cổng 3000 đã được sử dụng.",
      suggestion: "Đổi PORT trong .env hoặc dừng tiến trình đang giữ cổng.",
      sources: ["docs/setup.md"]
    },
    {
      problem: "Docker daemon chưa chạy.",
      suggestion: "Mở Docker Desktop rồi chạy lại docker compose up --build.",
      sources: ["README.md"]
    }
  ],
  conflicts: [],
  sources: ["README.md", "docs/setup.md", "docs/tasks.md"]
};

export function answerMockQuestion(message: string): ChatAnswer {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
  if (normalized.includes("chuan bi") || normalized.includes("can gi")) {
    return {
      answer: "Bạn cần Node.js 20+, Docker Desktop đang chạy và cổng 3000 khả dụng. Trước khi bắt đầu, hãy tạo file .env từ .env.example.",
      sources: [{ file: "LAB_GUIDE.md", section: "3. Yêu cầu chuẩn bị" }]
    };
  }
  if (normalized.includes("bat dau") || normalized.includes("dau tien")) {
    return {
      answer: "Bắt đầu tại thư mục gốc của dự án: chạy `npm install`, sau đó `cp .env.example .env`. Khi đã có cấu hình, chạy `docker compose up --build`.",
      sources: [{ file: "LAB_GUIDE.md", section: "4. Các bước thực hiện" }]
    };
  }
  if (normalized.includes("ket qua") || normalized.includes("hoan thanh") || normalized.includes("nop")) {
    return {
      answer: "Bạn cần nộp mã nguồn, Dockerfile, file compose và bằng chứng hai phép thử: GET /health trả về trạng thái ok, POST /api/notes trả về HTTP 201.",
      sources: [{ file: "LAB_GUIDE.md", section: "5. Yêu cầu hoàn thành" }]
    };
  }
  if (normalized.includes("loi") || normalized.includes("3000") || normalized.includes("docker")) {
    return {
      answer: "Hai lỗi thường gặp là cổng 3000 bị chiếm hoặc Docker daemon chưa chạy. Hãy đổi PORT trong .env, hoặc mở Docker Desktop rồi chạy lại lệnh compose.",
      sources: [{ file: "LAB_GUIDE.md", section: "7. Lỗi thường gặp" }]
    };
  }
  return {
    answer: "Bài lab hướng dẫn đóng gói Notes API Node.js bằng Docker, khởi động qua Docker Compose và kiểm tra các endpoint /health, /api/notes. Bạn có thể hỏi tôi về chuẩn bị, cách bắt đầu, lỗi thường gặp hoặc yêu cầu nộp bài.",
    sources: [{ file: "LAB_GUIDE.md", section: "1. Tổng quan" }]
  };
}
