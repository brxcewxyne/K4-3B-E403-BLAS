import { describe, expect, it, vi } from "vitest";
import { logEvent } from "@/lib/logging/logger";
import { hashString, redactValue, summarizeSourceMeta, truncateText } from "@/lib/logging/redact";

describe("structured logging", () => {
  it("emits a stable JSON event shape", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const event = logEvent({ eventType: "chat_request_started", sessionId: "session-1", repoId: "owner/repo", data: { question: "Hi" } });
      expect(event.eventType).toBe("chat_request_started");
      expect(event.sessionId).toBe("session-1");
      expect(event.repoId).toBe("owner/repo");
      expect(typeof event.timestamp).toBe("string");
      expect(typeof event.requestId).toBe("string");
      expect(info).toHaveBeenCalledOnce();
      const logged = JSON.parse(info.mock.calls[0][0] as string);
      expect(logged.eventType).toBe("chat_request_started");
      expect(logged.data.question).toBe("Hi");
    } finally {
      info.mockRestore();
    }
  });

  it("redacts secrets and never keeps .env contents", () => {
    expect(redactValue({
      apiKey: "sk-live-123",
      nested: { authToken: "abc", safe: "keep" },
      list: [{ password: "pw" }],
      headers: { Authorization: "Bearer xyz" }
    })).toEqual({
      apiKey: "[REDACTED]",
      nested: { authToken: "[REDACTED]", safe: "keep" },
      list: [{ password: "[REDACTED]" }],
      headers: { Authorization: "[REDACTED]" }
    });
    expect(redactValue({ path: ".env", content: "API_KEY=shh" })).toEqual({ path: ".env", content: "[OMITTED_ENV_CONTENT]" });
  });

  it("summarizes sources as metadata only and truncates long text", () => {
    const meta = summarizeSourceMeta({ id: "s1", path: "README.md", type: "markdown", content: "# Title\nBody", headings: ["Title"] });
    expect(meta).toMatchObject({ sourceId: "s1", path: "README.md", type: "markdown", characterCount: 12, headings: ["Title"] });
    expect(typeof meta.hash).toBe("string");
    expect("content" in meta).toBe(false);
    expect(truncateText("abcdef", 4)).toContain("…[truncated 2 chars]");
    expect(truncateText("abc", 4)).toBe("abc");
    expect(hashString("a")).toBe(hashString("a"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});
