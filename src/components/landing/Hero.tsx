import Link from "next/link";

const athletes = [
  {
    name: "Maya Johnson",
    meta: "Basketball · UCLA",
    followers: "124K",
    engagement: "4.8%",
    tags: ["Fitness", "Lifestyle"],
    gradient: "linear-gradient(135deg,#667EEA,#764BA2)",
  },
  {
    name: "Tiana Brooks",
    meta: "Track · LSU",
    followers: "312K",
    engagement: "8.1%",
    tags: ["Beauty", "Wellness"],
    gradient: "linear-gradient(135deg,#FA709A,#FEE140)",
  },
  {
    name: "Marcus Thompson",
    meta: "Football · Alabama",
    followers: "445K",
    engagement: "4.2%",
    tags: ["Sports", "Gaming"],
    gradient: "linear-gradient(135deg,#0BA360,#3CBA92)",
  },
  {
    name: "Sofia Martinez",
    meta: "Soccer · UNC",
    followers: "215K",
    engagement: "5.1%",
    tags: ["Travel", "Fashion"],
    gradient: "linear-gradient(135deg,#4FACFE,#00F2FE)",
  },
];

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-content">

          <div className="hero-badge">
            Built for the next era of NIL partnerships
          </div>

          <h1>
            Where college athletes
            <br />
            and brands <span className="green">build together</span>
          </h1>

          <p>
            NILHub connects student athletes with the right brand partnerships.
            Discover creators using real audience insights and manage deals in one place.
          </p>

          <div className="hero-ctas">
            <Link href="/auth" className="btn-pill btn-green">
              Get started free
            </Link>

            <button className="btn-pill btn-outline-light">
              Watch demo
            </button>
          </div>

          <p className="hero-note">
            No credit card required. Free for athletes.
          </p>

        </div>

        <div className="hero-mosaic">

          <div className="mosaic-highlight">
            <span className="highlight-dot"></span>
            Live creator discovery
          </div>

          {athletes.map((a) => (
            <div className="mosaic-card" key={a.name}>

              <div
                className="mosaic-avatar"
                style={{ background: a.gradient }}
              />

              <div className="mosaic-name">{a.name}</div>
              <div className="mosaic-meta">{a.meta}</div>

              <div className="mosaic-stats">
                <div>
                  <div className="mosaic-stat-val">{a.followers}</div>
                  <div className="mosaic-stat-label">Followers</div>
                </div>

                <div>
                  <div className="mosaic-stat-val">{a.engagement}</div>
                  <div className="mosaic-stat-label">Eng. Rate</div>
                </div>
              </div>

              <div className="mosaic-tags">
                {a.tags.map((tag) => (
                  <span key={tag} className="mosaic-tag">{tag}</span>
                ))}
              </div>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}