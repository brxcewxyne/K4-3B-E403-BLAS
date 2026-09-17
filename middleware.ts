import { NextRequest, NextResponse } from "next/server";

function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === request.nextUrl.origin) return origin;

  const configured = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (configured.includes(origin.replace(/\/$/, ""))) return origin;

  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const origin = allowedOrigin(request);
  const headers = new Headers();
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: origin ? 204 : 403, headers });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = { matcher: "/api/:path*" };
