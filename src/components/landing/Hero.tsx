import Image from "next/image";
import Link from "next/link";
import { heroLandingCollageUrls } from "@/lib/mockData";

const REEL_LEFT = heroLandingCollageUrls.slice(0, 3);
const REEL_RIGHT = heroLandingCollageUrls.slice(3, 6);

function ReelCard({
  src,
  priority,
  variant,
}: {
  src: string;
  priority?: boolean;
  variant: "left-a" | "left-b" | "left-c" | "right-a" | "right-b" | "right-c";
}) {
  return (
    <div className={`hero-reel hero-reel--${variant}`}>
      <div className="hero-reel__chrome">
        <span className="hero-reel__dot" />
        <span className="hero-reel__dot" />
        <span className="hero-reel__dot" />
      </div>
      <div className="hero-reel__body">
        <Image
          src={src}
          alt=""
          fill
          sizes="150px"
          className="hero-reel__img"
          priority={priority}
        />
      </div>
    </div>
  );
}

export default function Hero() {
  const leftVariants = ["left-a", "left-b", "left-c"] as const;
  const rightVariants = ["right-a", "right-b", "right-c"] as const;

  return (
    <section className="hero">
      <div className="hero-collage" aria-hidden>
        <div className="hero-reel-stack hero-reel-stack--left">
          {REEL_LEFT.map((src, i) => (
            <ReelCard
              key={src}
              src={src}
              priority={i < 2}
              variant={leftVariants[i]}
            />
          ))}
        </div>
        <div className="hero-reel-stack hero-reel-stack--right">
          {REEL_RIGHT.map((src, i) => (
            <ReelCard
              key={src}
              src={src}
              priority={i < 2}
              variant={rightVariants[i]}
            />
          ))}
        </div>
      </div>
      <div className="hero-scrim" aria-hidden />
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
            Discover partners and manage NIL deals in one place.
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
