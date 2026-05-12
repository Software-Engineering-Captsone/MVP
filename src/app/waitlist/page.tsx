import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/landing.css";
import {
  Navbar,
  Footer,
  FadeUpObserver,
  WaitlistForm,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "Join waitlist - NILINK",
  description:
    "Join the NILINK waitlist for future updates as the capstone MVP prototype evolves.",
};

export default function WaitlistPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <main className="sales-page-main">
        <Link href="/" className="watch-demo-back">
          ← Back to home
        </Link>
        <p className="watch-demo-eyebrow">Waitlist</p>
        <h1 className="watch-demo-title">Follow NILINK beyond the MVP</h1>
        <p className="watch-demo-lede">
          NILINK is currently a capstone prototype. Join the waitlist if you want updates as the product direction, partnerships, and launch readiness evolve.
        </p>

        <WaitlistForm />
      </main>
      <Footer />
      <FadeUpObserver />
    </div>
  );
}
