import Link from "next/link";

export default function Navbar() {
  return (
    <header className="landing-nav-shell">
      <div className="landing-nav-dock">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-nav-wordmark">
            NILINK
          </Link>

          <nav className="landing-nav-center" aria-label="Primary">
            <ul className="landing-nav-menu">
              <li><a href="#how">How it works</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#athletes">For Athletes</a></li>
              <li><a href="#brands">For Brands</a></li>
            </ul>
          </nav>

          <div className="landing-nav-right">
            <Link href="/auth" className="landing-nav-ghost">
              Log in
            </Link>
            <Link href="/auth?mode=signup" className="landing-nav-ghost">
              Try MVP
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
