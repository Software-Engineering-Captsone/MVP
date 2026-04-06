import Link from 'next/link';

export default function CTA() {
    return (
        <section className="cta-section">
            <h2 className="fade-up">Ready to find your next partnership?</h2>
            <p className="fade-up">Join thousands of athletes and brands already on NILINK.</p>
            <div className="cta-buttons fade-up">
                <Link href="/auth" className="btn-pill btn-nilink-primary">Start free trial</Link>
                <Link href="/talk-to-sales" className="btn-pill btn-outline-light">Talk to sales</Link>
            </div>
        </section>
    );
}
