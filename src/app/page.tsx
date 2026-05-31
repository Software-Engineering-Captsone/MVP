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
  CTA,
  Footer,
  FadeUpObserver,
  WaitlistModal,
  LandingHashScroll,
} from '@/components/landing';

export default function Home() {
  return (
    <div className="landing-page">
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
      <CTA />
      <Footer />
      <FadeUpObserver />
      <WaitlistModal />
      <LandingHashScroll />
    </div>
  );
}
