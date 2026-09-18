"use client";

import { useEffect, useRef } from "react";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4";
const CROSSFADE_MS = 500;
const CROSSFADE_LEAD_SECONDS = 0.5;

function waitUntilPlayable(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
  video.load();
  return new Promise<void>((resolve, reject) => {
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Standby background video failed to load.")); };
    const cleanup = () => {
      video.removeEventListener("canplay", ready);
      video.removeEventListener("error", failed);
    };
    video.addEventListener("canplay", ready, { once: true });
    video.addEventListener("error", failed, { once: true });
  });
}

export function BackgroundVideo() {
  const firstVideo = useRef<HTMLVideoElement>(null);
  const secondVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const first = firstVideo.current;
    const second = secondVideo.current;
    if (!first || !second) return;
    const videos = [first, second] as const;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active: 0 | 1 = 0;
    let transitioning = false;
    let animationFrame = 0;
    let disposed = false;

    videos.forEach((video, index) => {
      video.playbackRate = 1;
      video.style.opacity = index === 0 ? "1" : "0";
      video.load();
    });

    async function beginCrossfade(layer: 0 | 1) {
      const current = videos[layer];
      if (disposed || media.matches || transitioning || layer !== active || !current.duration) return;
      if (!current.ended && current.duration - current.currentTime > CROSSFADE_LEAD_SECONDS) return;

      transitioning = true;
      const nextLayer = (layer === 0 ? 1 : 0) as 0 | 1;
      const next = videos[nextLayer];

      try {
        await waitUntilPlayable(next);
        if (disposed) return;
        next.playbackRate = 1;
        next.currentTime = 0;
        await next.play();
      } catch {
        transitioning = false;
        return;
      }

      const startedAt = performance.now();
      const draw = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - startedAt) / CROSSFADE_MS);
        current.style.opacity = String(1 - progress);
        next.style.opacity = String(progress);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(draw);
          return;
        }

        current.style.opacity = "0";
        next.style.opacity = "1";
        current.pause();
        current.currentTime = 0;
        active = nextLayer;
        transitioning = false;
      };
      animationFrame = requestAnimationFrame(draw);
    }

    const onFirstTime = () => void beginCrossfade(0);
    const onSecondTime = () => void beginCrossfade(1);
    videos[0].addEventListener("timeupdate", onFirstTime);
    videos[0].addEventListener("ended", onFirstTime);
    videos[1].addEventListener("timeupdate", onSecondTime);
    videos[1].addEventListener("ended", onSecondTime);

    if (!media.matches) void videos[0].play();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      videos[0].removeEventListener("timeupdate", onFirstTime);
      videos[0].removeEventListener("ended", onFirstTime);
      videos[1].removeEventListener("timeupdate", onSecondTime);
      videos[1].removeEventListener("ended", onSecondTime);
    };
  }, []);

  return (
    <div className="cinematic-bg" aria-hidden="true">
      <video ref={firstVideo} autoPlay muted playsInline preload="auto" src={VIDEO_URL} />
      <video ref={secondVideo} muted playsInline preload="auto" src={VIDEO_URL} />
      <div className="cinematic-overlay" />
    </div>
  );
}
