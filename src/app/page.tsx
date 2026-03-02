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
} from '@/components/landing';

export default function Home() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <DualAudience />
      <Features />
      <Stats />
      <Testimonial />
      <CTA />
      <Footer />
      <FadeUpObserver />
    </div>
  );
}
