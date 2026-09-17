"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        smoothWheel: true,
        lerp: 0.08,
        autoRaf: true,
        respectReducedMotion: true
      }}
    >
      {children}
    </ReactLenis>
  );
}
