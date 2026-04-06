"use client";

import Link from "next/link";
import { useCallback, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { scrollBehaviorForSection } from "@/lib/landingScroll";

function sectionHref(id: string, onHome: boolean) {
  return onHome ? `#${id}` : `/#${id}`;
}

export default function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  const onSectionClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, id: string) => {
      if (!onHome) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = scrollBehaviorForSection(el, id, reduced);
      el.scrollIntoView({ behavior, block: "start" });
      window.history.replaceState(null, "", `#${id}`);
    },
    [onHome]
  );

  return (
    <header className="landing-nav-shell">
      <div className="landing-nav-dock">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-nav-wordmark">
            NILINK
          </Link>

          <nav className="landing-nav-center" aria-label="Primary">
            <ul className="landing-nav-menu">
              <li>
                <a
                  href={sectionHref("how", onHome)}
                  onClick={(e) => onSectionClick(e, "how")}
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href={sectionHref("features", onHome)}
                  onClick={(e) => onSectionClick(e, "features")}
                >
                  Features
                </a>
              </li>
              <li>
                <Link href="/watch-demo">Watch demo</Link>
              </li>
              <li>
                <a
                  href={sectionHref("athletes", onHome)}
                  onClick={(e) => onSectionClick(e, "athletes")}
                >
                  For Athletes
                </a>
              </li>
              <li>
                <a
                  href={sectionHref("brands", onHome)}
                  onClick={(e) => onSectionClick(e, "brands")}
                >
                  For Brands
                </a>
              </li>
              <li>
                <a
                  href={sectionHref("pricing", onHome)}
                  onClick={(e) => onSectionClick(e, "pricing")}
                >
                  Pricing
                </a>
              </li>
            </ul>
          </nav>

          <div className="landing-nav-right">
            <Link href="/auth" className="landing-nav-ghost">
              Log in
            </Link>
            <Link href="/auth" className="landing-nav-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
