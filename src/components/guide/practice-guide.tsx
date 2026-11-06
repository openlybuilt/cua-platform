"use client";

export function PracticeGuide({ onClose }: { onClose: () => void }) {
  return <div className="practice-guide" role="dialog" aria-modal="true" aria-labelledby="practice-guide-title">
    <div className="practice-guide-card">
      <h2 id="practice-guide-title">Welcome to Openly</h2>
      <p>Let’s build a workflow together in a practice space.</p>
      <button type="button" onClick={onClose}>Close guide</button>
    </div>
  </div>;
}
