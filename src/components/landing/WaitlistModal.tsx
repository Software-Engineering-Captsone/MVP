"use client";

import { useCallback, useEffect, useState } from "react";
import WaitlistForm from "./WaitlistForm";
import { WAITLIST_OPEN_EVENT } from "./WaitlistButton";

/**
 * Single waitlist popup mounted once at page level (like <FadeUpObserver />).
 * Opens on the WAITLIST_OPEN_EVENT window event dispatched by <WaitlistButton />;
 * closes on Escape, backdrop click, and the close button.
 */
export default function WaitlistModal() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(WAITLIST_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WAITLIST_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    // Prevent background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="waitlist-modal-overlay"
      role="presentation"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-modal-title"
        className="waitlist-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="waitlist-modal-close"
          aria-label="Close"
          onClick={close}
        >
          ×
        </button>
        <h2 id="waitlist-modal-title" className="waitlist-modal-title">
          Join the waitlist
        </h2>
        <p className="waitlist-modal-lede">
          NILINK is a capstone prototype. Join the waitlist for updates as the
          product direction, partnerships, and launch readiness evolve.
        </p>
        <WaitlistForm />
      </div>
    </div>
  );
}
