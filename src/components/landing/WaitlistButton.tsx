"use client";

export const WAITLIST_OPEN_EVENT = "open-waitlist";

/**
 * Opens the shared <WaitlistModal /> by dispatching a window event, so any
 * number of triggers (Hero, CTA, footer) can drive a single modal instance.
 */
export default function WaitlistButton({
  className = "btn-pill btn-outline",
  children = "Join waitlist",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(WAITLIST_OPEN_EVENT))}
    >
      {children}
    </button>
  );
}
