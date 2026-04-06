import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/landing.css";
import {
  Navbar,
  Footer,
  FadeUpObserver,
  TalkToSalesForm,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "Talk to sales — NILINK",
  description:
    "Tell us about your team and goals. We’ll help you find the right NILINK plan for enterprise, schools, and agencies.",
};

export default function TalkToSalesPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <main className="sales-page-main">
        <Link href="/" className="watch-demo-back">
          ← Back to home
        </Link>
        <p className="watch-demo-eyebrow">Sales</p>
        <h1 className="watch-demo-title">Talk to our team</h1>
        <p className="watch-demo-lede">
          Planning enterprise rollout, need SSO or custom contracts, or want volume
          pricing? Leave your details and we&apos;ll get back to you within one business
          day.
        </p>

        <TalkToSalesForm />
      </main>
      <Footer />
      <FadeUpObserver />
    </div>
  );
}
