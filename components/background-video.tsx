"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4";
const CROSSFADE_SECONDS = 1.1;

export function BackgroundVideo() {
  const firstVideo = useRef<HTMLVideoElement>(null);
  const secondVideo = useRef<HTMLVideoElement>(null);
  const videos = [firstVideo, secondVideo] as const;
  const [active, setActive] = useState<0 | 1>(0);
  const [incoming, setIncoming] = useState<0 | 1 | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const transitioning = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    secondVideo.current?.load();
  }, [reducedMotion]);

  async function beginCrossfade(layer: 0 | 1) {
    const current = videos[layer].current;
    if (reducedMotion || layer !== active || transitioning.current || !current?.duration) return;
    if (current.duration - current.currentTime > CROSSFADE_SECONDS) return;
    const nextLayer = (layer === 0 ? 1 : 0) as 0 | 1;
    const next = videos[nextLayer].current;
    if (!next) return;
    transitioning.current = true;
    try {
      if (next.readyState < HTMLMediaElement.HAVE_METADATA) {
        next.load();
        await new Promise<void>((resolve, reject) => {
          next.addEventListener("loadedmetadata", () => resolve(), { once: true });
          next.addEventListener("error", () => reject(new Error("Standby background video failed to load.")), { once: true });
        });
      }
      next.currentTime = 0;
      await next.play();
      setIncoming(nextLayer);
    } catch {
      transitioning.current = false;
      await current.play().catch(() => undefined);
    }
  }

  function finishCrossfade(layer: 0 | 1) {
    if (incoming !== layer) return;
    const previous = videos[active].current;
    previous?.pause();
    if (previous) previous.currentTime = 0;
    setActive(layer);
    setIncoming(null);
    transitioning.current = false;
  }

  if (reducedMotion) {
    return <div className="cinematic-bg" aria-hidden="true"><video muted playsInline preload="auto" src={VIDEO_URL} /><div className="cinematic-overlay" /></div>;
  }

  return (
    <div className="cinematic-bg" aria-hidden="true">
      {([0, 1] as const).map((layer) => <video
        key={layer}
        ref={videos[layer]}
        className={(incoming === null ? active === layer : incoming === layer) ? "visible" : ""}
        autoPlay={layer === 0}
        muted
        playsInline
        preload="auto"
        src={VIDEO_URL}
        onTimeUpdate={() => void beginCrossfade(layer)}
        onEnded={() => void beginCrossfade(layer)}
        onTransitionEnd={(event) => { if (event.propertyName === "opacity") finishCrossfade(layer); }}
      />)}
      <div className="cinematic-overlay" />
    </div>
  );
}
