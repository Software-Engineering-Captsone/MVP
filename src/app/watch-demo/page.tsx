import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/landing.css";
import {
  Navbar,
  Footer,
  FadeUpObserver,
  DemoVideoSection,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "Watch demo — NILINK",
  description:
    "See NILINK in action: a walkthrough of the marketplace, profiles, and deal tools for athletes and brands.",
};

const OUTCOMES = [
  "How athletes and brands discover each other on NILINK",
  "A tour of profiles, campaigns, and messaging",
  "Tips for getting the most from your first partnership",
];

export default function WatchDemoPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <main className="watch-demo-main">
        <Link href="/" className="watch-demo-back">
          ← Back to home
        </Link>
        <p className="watch-demo-eyebrow">Product tour</p>
        <h1 className="watch-demo-title">Watch the NILINK demo</h1>
        <p className="watch-demo-lede">
          A full walkthrough of the product—perfect for sharing with teammates or
          deciding whether NILINK fits your program.
        </p>

        <DemoVideoSection />

        <section className="watch-demo-outcomes" aria-labelledby="watch-demo-outcomes-heading">
          <h2 id="watch-demo-outcomes-heading" className="watch-demo-outcomes__title">
            What you&apos;ll see
          </h2>
          <ul className="watch-demo-outcomes__list">
            {OUTCOMES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <div className="watch-demo-cta">
          <Link href="/auth" className="btn-pill btn-nilink-primary">
            Get started free
          </Link>
        </div>
      </main>
      <Footer />
      <FadeUpObserver />
    </div>
  );
}
