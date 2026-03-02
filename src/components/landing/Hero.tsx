import Link from 'next/link';

export default function Hero() {
    return (
        <section className="hero">
            <div className="hero-inner">
                <div className="hero-content">
                    <h1>Where college athletes and brands <span className="green">build together</span></h1>
                    <p>NILHub is the marketplace that connects student athletes with the right brand partnerships. Real social data, simple deal management, and profiles that actually showcase who you are.</p>
                    <div className="hero-ctas">
                        <Link href="/auth" className="btn-pill btn-green">Start free trial</Link>
                        <button className="btn-pill btn-outline-light">Watch demo</button>
                    </div>
                    <p className="hero-note">No credit card required. Free for athletes.</p>
                </div>

                <div className="hero-mosaic">
                    <div className="mosaic-card">
                        <div className="mosaic-avatar" style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}></div>
                        <div className="mosaic-name">Maya Johnson</div>
                        <div className="mosaic-meta">Basketball · UCLA</div>
                        <div className="mosaic-stats">
                            <div><div className="mosaic-stat-val">124K</div><div className="mosaic-stat-label">Followers</div></div>
                            <div><div className="mosaic-stat-val">4.8%</div><div className="mosaic-stat-label">Eng. Rate</div></div>
                        </div>
                        <span className="mosaic-tag">Fitness</span><span className="mosaic-tag">Lifestyle</span>
                    </div>

                    <div className="mosaic-card">
                        <div className="mosaic-avatar" style={{ background: 'linear-gradient(135deg, #FA709A, #FEE140)' }}></div>
                        <div className="mosaic-name">Tiana Brooks</div>
                        <div className="mosaic-meta">Track · LSU</div>
                        <div className="mosaic-stats">
                            <div><div className="mosaic-stat-val">312K</div><div className="mosaic-stat-label">Followers</div></div>
                            <div><div className="mosaic-stat-val">8.1%</div><div className="mosaic-stat-label">Eng. Rate</div></div>
                        </div>
                        <span className="mosaic-tag">Beauty</span><span className="mosaic-tag">Wellness</span>
                    </div>

                    <div className="mosaic-card">
                        <div className="mosaic-avatar" style={{ background: 'linear-gradient(135deg, #0BA360, #3CBA92)' }}></div>
                        <div className="mosaic-name">Marcus Thompson</div>
                        <div className="mosaic-meta">Football · Alabama</div>
                        <div className="mosaic-stats">
                            <div><div className="mosaic-stat-val">445K</div><div className="mosaic-stat-label">Followers</div></div>
                            <div><div className="mosaic-stat-val">4.2%</div><div className="mosaic-stat-label">Eng. Rate</div></div>
                        </div>
                        <span className="mosaic-tag">Sports</span><span className="mosaic-tag">Gaming</span>
                    </div>

                    <div className="mosaic-card">
                        <div className="mosaic-avatar" style={{ background: 'linear-gradient(135deg, #4FACFE, #00F2FE)' }}></div>
                        <div className="mosaic-name">Sofia Martinez</div>
                        <div className="mosaic-meta">Soccer · UNC</div>
                        <div className="mosaic-stats">
                            <div><div className="mosaic-stat-val">215K</div><div className="mosaic-stat-label">Followers</div></div>
                            <div><div className="mosaic-stat-val">5.1%</div><div className="mosaic-stat-label">Eng. Rate</div></div>
                        </div>
                        <span className="mosaic-tag">Travel</span><span className="mosaic-tag">Fashion</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
