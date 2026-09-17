# LAB GUIDE AI

MVP Next.js cho ứng dụng tổng hợp tài liệu Markdown của bài lab thành `LAB_GUIDE.md` và chatbot hỏi đáp dựa trên guide có nguồn.

## Công nghệ

- Next.js App Router, TypeScript strict mode, Tailwind CSS
- SQLite + Prisma
- `simple-git` để clone GitHub public
- `adm-zip` để xử lý ZIP an toàn
- `unified` + `remark-parse` để phân tích Markdown
- LLM API qua biến môi trường
- Zod để validate input và structured output

## Biến môi trường

Tạo `.env` từ `.env.example`:

```env
AI_API_KEY=
AI_BASE_URL=
AI_SUMMARIZE_MODEL=
AI_CHAT_MODEL=
DATABASE_URL="file:./dev.db"
```

Nếu dùng OpenAI trực tiếp, có thể để trống `AI_BASE_URL`; app mặc định dùng `https://api.openai.com/v1`.

## Cài đặt và chạy

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra

```bash
npm run type-check
npm run lint
npm run test
```

## API

- `POST /api/guides/from-github`
- `POST /api/guides/from-zip`
- `GET /api/guides/:id`
- `GET /api/guides/:id/download`
- `POST /api/guides/:id/chat`
- `GET /api/guides/:id/sources`

## Cây thư mục chính

```text
app/
  api/guides/
  page.tsx
lib/
  ai.ts
  github.ts
  guide-renderer.ts
  guide-service.ts
  markdown.ts
  zip-loader.ts
prisma/
  schema.prisma
tests/
```

## Giới hạn MVP

- Chỉ hỗ trợ GitHub public và ZIP.
- Không đăng nhập, không GitHub OAuth, không repository private.
- Không chạy command trong repository.
- Không dùng vector database; chatbot đưa toàn bộ guide vào context hoặc chọn section bằng keyword nếu guide quá dài.
