import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-content">

          <div className="hero-badge">
            Built for the next era of NIL partnerships
          </div>

          <h1 className="hero-title">
            <span className="hero-title__line">Where</span>
            <span className="hero-title__line">college athletes and brands</span>
            <span className="hero-title__line hero-title__line--accent">
              build together
            </span>
          </h1>

          <p className="hero-lede">
            Discover the right partners and manage NIL deals in one place.
          </p>

          <div className="hero-ctas">
            <Link href="/auth" className="btn-pill btn-nilink-primary">
              Get started free
            </Link>

            <button type="button" className="btn-pill btn-outline">
              Watch demo
            </button>
          </div>

          <p className="hero-note">
            No credit card required. Free for athletes.
          </p>

        </div>
      </div>
    </section>
  );
}
