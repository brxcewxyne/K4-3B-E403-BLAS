"use client";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4";

export function BackgroundVideo() {
  return (
    <div className="cinematic-bg" aria-hidden="true">
      <video autoPlay muted loop playsInline preload="auto" src={VIDEO_URL} />
      <div className="cinematic-overlay" />
    </div>
  );
}
