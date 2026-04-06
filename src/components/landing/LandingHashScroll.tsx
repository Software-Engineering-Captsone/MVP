"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollBehaviorForSection } from "@/lib/landingScroll";

/**
 * After client navigation to `/` with a hash (e.g. from /watch-demo), scroll the
 * target into view smoothly. Native behavior is inconsistent with Next.js routing.
 */
export default function LandingHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const raw = window.location.hash;
    if (!raw || raw.length < 2) return;
    const id = decodeURIComponent(raw.slice(1));
    if (!id) return;

    /* Defer until after route paint so #id exists in the DOM */
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = scrollBehaviorForSection(el, id, reduced);
      el.scrollIntoView({ behavior, block: "start" });
    }, 80);

    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
