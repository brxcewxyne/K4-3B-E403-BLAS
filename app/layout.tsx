import type { Metadata } from "next";
import { SmoothScroll } from "@/components/smooth-scroll";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI20k Lab Guide",
  description: "Source-backed workflow assistant for AI20k labs"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SmoothScroll>{children}</SmoothScroll></body>
    </html>
  );
}
