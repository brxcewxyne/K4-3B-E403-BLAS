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
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_DEMO_MODE=false
FRONTEND_ORIGINS=http://localhost:3000
```

Nếu dùng OpenAI trực tiếp, có thể để trống `AI_BASE_URL`; app mặc định dùng `https://api.openai.com/v1`.

## Frontend demo mode

Demo mode chạy hoàn toàn trong trình duyệt, không gọi bất kỳ API route hay backend bên ngoài nào. Backend thật và API client vẫn được giữ nguyên.

```env
NEXT_PUBLIC_DEMO_MODE=true
```

Chạy local:

```bash
npm install
npm run dev
```

Trong demo mode, sources, chat theo intent, citations, workflow progress và Add materials đều dùng dữ liệu local. GitHub URL và file upload chỉ được mô phỏng; UI luôn ghi rõ không có dữ liệu nào được gửi hoặc index.

## Cài đặt và chạy

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Mở `http://localhost:3000`.

## Kiến trúc triển khai production

Backend hiện tại vẫn được giữ nguyên: Next.js Route Handlers + Prisma/SQLite, clone GitHub, giải nén ZIP và gọi LLM. Các tác vụ này dùng filesystem, có thể chạy lâu và cần database bền vững, vì vậy **không nên ép backend hiện tại vào Vercel Functions**.

```text
Vercel frontend
      ↓ NEXT_PUBLIC_API_BASE_URL
Backend hiện tại trên host Node.js có persistent storage
```

- `NEXT_PUBLIC_API_BASE_URL` là URL công khai của backend, ví dụ `https://api.example.com`. Đây là giá trị an toàn để trình duyệt biết; không đặt API key ở biến `NEXT_PUBLIC_*`.
- `FRONTEND_ORIGINS` chỉ được cấu hình phía backend. Dùng danh sách origin phân tách bằng dấu phẩy, ví dụ `https://lab-guide.vercel.app,http://localhost:3000`.
- `AI_API_KEY`, model và `DATABASE_URL` chỉ tồn tại trên backend.
- Preview URL của Vercel không được tự động cho phép. Nếu cần preview, thêm đúng origin preview vào `FRONTEND_ORIGINS`; không dùng wildcard.

### Deploy frontend lên Vercel

Frontend-only demo tạm thời:

1. Import repository vào Vercel và chọn thư mục project này làm Root Directory.
2. Giữ framework preset `Next.js`; Build Command là `npm run build`.
3. Thêm `NEXT_PUBLIC_DEMO_MODE=true` cho Production và Preview. Không cần cấu hình `NEXT_PUBLIC_API_BASE_URL`.
4. Deploy và kiểm tra Sources, demo chat, citation, progress và Add materials. Không request backend nào được gửi trong chế độ này.

Khi kết nối backend production:

1. Import repository vào Vercel và chọn thư mục project này làm Root Directory.
2. Giữ framework preset `Next.js`; Build Command là `npm run build`. Không cần `vercel.json`.
3. Thêm `NEXT_PUBLIC_API_BASE_URL=https://<backend-host>` cho Production (và Preview nếu backend cho phép origin đó).
4. Deploy, sau đó thêm URL Vercel chính xác vào `FRONTEND_ORIGINS` trên backend và restart backend.
5. Kiểm tra import GitHub, upload ZIP, chat và tải source từ URL production.

Nếu deploy full-stack trên một host Node.js có persistent storage, để trống `NEXT_PUBLIC_API_BASE_URL`; frontend sẽ gọi API cùng origin.

Để deploy frontend-only tạm thời, đặt `NEXT_PUBLIC_DEMO_MODE=true`; khi đó không cần `NEXT_PUBLIC_API_BASE_URL`. Để kết nối lại backend sau này, đặt `NEXT_PUBLIC_DEMO_MODE=false`, cấu hình `NEXT_PUBLIC_API_BASE_URL`, rồi redeploy.

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
