import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI20k Lab Guide",
  description: "Source-backed workflow assistant for AI20k labs"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
