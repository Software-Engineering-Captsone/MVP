import Link from 'next/link';

export default function DualAudience() {
    return (
        <section className="dual-section">
            <div className="dual-header fade-up">
                <div className="section-eyebrow">Built for both sides</div>
                <h2 className="section-heading">One platform, two powerful experiences</h2>
            </div>
            <div className="dual-grid">
                <div className="dual-card dual-card-light fade-up" id="athletes">
                    <h3>For Athletes</h3>
                    <p>Turn your personal brand into income. Showcase your stats, let brands come to you, and manage every deal in one place.</p>
                    <ul className="dual-list">
                        <li><span className="dual-check">✓</span> Build a profile using your real social data</li>
                        <li><span className="dual-check">✓</span> Get discovered by brands in your niche</li>
                        <li><span className="dual-check">✓</span> Manage offers and track your earnings</li>
                        <li><span className="dual-check">✓</span> Show off past brand work and content</li>
                    </ul>
                    <Link href="/auth?mode=signup" className="btn-pill btn-dark">Sign up as an athlete <span className="btn-dual-arrow">→</span></Link>
                </div>
                <div className="dual-card dual-card-dark fade-up" id="brands">
                    <h3>For Brands</h3>
                    <p>Find athletes that match your audience. Browse real engagement data, send proposals, and run campaigns from a single dashboard.</p>
                    <ul className="dual-list">
                        <li><span className="dual-check">✓</span> Browse athletes by sport, school, and reach</li>
                        <li><span className="dual-check">✓</span> View Instagram analytics and demographics</li>
                        <li><span className="dual-check">✓</span> Send deal proposals and manage campaigns</li>
                        <li><span className="dual-check">✓</span> Set your brand tone for better athlete fit</li>
                    </ul>
                    <Link href="/auth?mode=signup" className="btn-pill btn-nilink-primary">Sign up as a brand <span className="btn-dual-arrow">→</span></Link>
                </div>
            </div>
        </section>
    );
}
