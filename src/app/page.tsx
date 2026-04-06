import '@/styles/landing.css';
import {
  Navbar,
  Hero,
  TrustBar,
  HowItWorks,
  DualAudience,
  Features,
  Stats,
  Testimonial,
  Pricing,
  CTA,
  Footer,
  FadeUpObserver,
  LandingHashScroll,
} from '@/components/landing';

export default function Home() {
  return (
    <div className="landing-page">
      <LandingHashScroll />
      <Navbar />
      <div className="landing-hero-cluster">
        <Hero />
        <TrustBar />
      </div>
      <HowItWorks />
      <DualAudience />
      <Features />
      <Stats />
      <Testimonial />
      <Pricing />
      <CTA />
      <Footer />
      <FadeUpObserver />
    </div>
  );
}
