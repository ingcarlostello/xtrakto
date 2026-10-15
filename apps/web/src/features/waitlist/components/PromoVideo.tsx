"use client";

import { Play } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { LANDING_COPY, PROMO_VIDEO } from "../waitlist.constants";

const COPY = LANDING_COPY.video;

/** Over the whole poster; its focus ring drawn inside, which the frame clips. */
function PlayButton({ onPlay }: { onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={COPY.play}
      className="group absolute inset-0 grid cursor-pointer place-items-center focus-visible:outline-offset-[-6px]"
    >
      <span className="grid size-16 place-items-center rounded-full bg-primary text-white shadow-primary transition-transform group-hover:scale-105 motion-reduce:transition-none">
        <Play className="size-7 translate-x-0.5" fill="currentColor" />
      </span>
    </button>
  );
}

/**
 * The promo video (ADR 0020), never played on its own: the poster shows and
 * nothing downloads until someone presses play; then the browser's own
 * controls take over. Its description tells what it shows, for whoever
 * can't see it.
 */
export function PromoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const descriptionId = useId();

  // The play button goes away once pressed: the focus moves to the video,
  // which has its controls by then, so a keyboard keeps its place.
  useEffect(() => {
    if (isStarted) video.current?.focus();
  }, [isStarted]);

  const play = () => {
    setIsStarted(true);
    // If the browser refuses, its controls are showing: pressing them plays.
    video.current?.play().catch(() => undefined);
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-surface shadow-panel">
      <video
        ref={video}
        className="size-full object-cover"
        poster={PROMO_VIDEO.poster}
        preload="none"
        playsInline
        controls={isStarted}
        aria-describedby={descriptionId}
      >
        <source src={PROMO_VIDEO.src} type="video/mp4" />
      </video>
      {!isStarted && <PlayButton onPlay={play} />}
      <p id={descriptionId} className="sr-only">
        {COPY.description}
      </p>
    </div>
  );
}
