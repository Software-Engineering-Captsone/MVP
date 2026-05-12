import Link from 'next/link';

export default function CTA() {
    return (
        <section className="cta-section">
            <h2 className="fade-up">Want to test the NILINK prototype?</h2>
            <p className="fade-up">Try the current MVP or join the waitlist for future product updates.</p>
            <div className="cta-buttons fade-up">
                <Link href="/auth?mode=signup" className="btn-pill btn-nilink-primary">Try the MVP</Link>
                <Link href="/waitlist" className="btn-pill btn-outline-light">Join waitlist</Link>
            </div>
        </section>
    );
}
