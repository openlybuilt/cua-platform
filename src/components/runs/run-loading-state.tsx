"use client";

// Pixel loading indicator adapted from Beautiful UI's Loading State component.
export function RunLoadingState({ status, elapsed }: { status: string; elapsed: string }) {
  const label = status.replaceAll("_", " ");
  return <span className="run-loading-state" role="timer" aria-live="off">
    <span className="run-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} style={{ animationDelay: `${(index % 3 + Math.abs(Math.floor(index / 3) - 1)) * 90}ms` }} />)}</span>
    <span className="run-loading-label">{label}</span><span>{elapsed}</span>
  </span>;
}
