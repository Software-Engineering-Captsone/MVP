import Image from "next/image";
import Link from "next/link";
import { heroLandingCollageUrls } from "@/lib/mockData";

const REEL_LEFT = heroLandingCollageUrls.slice(0, 3);
const REEL_RIGHT = heroLandingCollageUrls.slice(3, 6);

function CollageCard({
  src,
  priority,
  variant,
}: {
  src: string;
  priority?: boolean;
  variant: "left-a" | "left-b" | "left-c" | "right-a" | "right-b" | "right-c";
}) {
  return (
    <div className={`hero-collage-card hero-collage-card--${variant}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 900px) 0px, 200px"
        className="hero-collage-card__img"
        priority={priority}
      />
    </div>
  );
}

export default function Hero() {
  const leftVariants = ["left-a", "left-b", "left-c"] as const;
  const rightVariants = ["right-a", "right-b", "right-c"] as const;

  return (
    <section className="hero">
      <div className="hero-collage" aria-hidden>
        <div className="hero-collage-stack hero-collage-stack--left">
          {REEL_LEFT.map((src, i) => (
            <CollageCard
              key={src}
              src={src}
              priority={i < 2}
              variant={leftVariants[i]}
            />
          ))}
        </div>
        <div className="hero-collage-stack hero-collage-stack--right">
          {REEL_RIGHT.map((src, i) => (
            <CollageCard
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
            Capstone MVP prototype for NIL partnerships
          </div>

          <h1 className="hero-title">
            <span className="hero-title__line">Where</span>
            <span className="hero-title__line">college athletes and brands</span>
            <span className="hero-title__line hero-title__line--accent">
              build together
            </span>
          </h1>

          <p className="hero-lede">
            Explore how athletes and brands could discover partners and manage NIL deals in one place.
          </p>

          <div className="hero-ctas">
            <Link href="/auth?mode=signup" className="btn-pill btn-nilink-primary">
              Try the MVP
            </Link>

            <Link href="/waitlist" className="btn-pill btn-outline">
              Join waitlist
            </Link>
          </div>

          <p className="hero-note">
            Prototype access for testing and capstone review - not a launched commercial service.
          </p>

        </div>
      </div>
    </section>
  );
}
