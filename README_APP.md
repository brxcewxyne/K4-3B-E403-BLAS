# Lab Guide AI

Lab Guide AI is a single Next.js application that turns public GitHub repositories or uploaded Markdown files into a cited learning workflow. The same ingested sources are used for grounded chat, so every citation points back to source content shown in the workspace.

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`, then add either:

- a public GitHub repository URL in the form `https://github.com/owner/repository`; or
- one or more `.md` or `.mdx` files.

The application accepts at most 50 files, 1 MB per file, and 2 MB of Markdown in total.

## Environment variables

```env
AI_API_KEY=
AI_BASE_URL=
AI_SUMMARIZE_MODEL=
AI_CHAT_MODEL=
```

- `AI_API_KEY` is required and remains server-side.
- `AI_BASE_URL` is optional and defaults to `https://api.openai.com/v1`.
- `AI_SUMMARIZE_MODEL` and `AI_CHAT_MODEL` are required model names for workflow generation and chat.

There are no public API keys, database variables, or frontend API-base variables. The browser calls same-origin Next.js route handlers.

## Architecture

```text
Browser workspace
  -> POST /api/ingest    GitHub URL or Markdown uploads
  -> POST /api/workflow  cited workflow generation
  -> POST /api/chat      retrieval plus grounded answer

Next.js route handlers
  -> public GitHub REST/raw endpoints
  -> configured OpenAI-compatible API
```

The app does not clone repositories, execute repository code, write uploaded content to disk, or require a database. Checklist progress and the selected source are stored in the browser's `localStorage`.

## API

- `POST /api/ingest` accepts JSON `{ "repositoryUrl": "..." }` or multipart form data containing `files`.
- `POST /api/workflow` accepts `{ "sources": SourceDocument[] }`.
- `POST /api/chat` accepts `{ "sources": SourceDocument[], "workflow": LabWorkflow, "messages": ChatTurn[] }`.

All routes return either `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code", "message", "details"? } }`.

## Verification

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

## Deploy to Vercel

1. Import this repository in Vercel and choose this directory as the project Root Directory.
2. Keep the Next.js framework preset and the default `npm run build` command.
3. Configure the four server-side `AI_*` variables for Production and Preview.
4. Deploy. No `vercel.json`, persistent filesystem, Prisma migration, or external database is required.

GitHub ingestion supports public repositories only. Private repositories and GitHub authentication are intentionally outside this MVP.
