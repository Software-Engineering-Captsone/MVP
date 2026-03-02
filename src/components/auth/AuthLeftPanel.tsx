import Link from 'next/link';

export default function AuthLeftPanel() {
    return (
        <div className="auth-left">
            <Link href="/" className="auth-left-logo">
                <div className="auth-left-logo-mark"></div>
                <span className="auth-left-logo-text">NILHub</span>
            </Link>

            <div className="auth-left-content">
                <h1>Build partnerships <em>that matter</em></h1>
                <p>Join the marketplace where college athletes and brands connect for authentic, data-driven NIL partnerships.</p>
            </div>

            <div className="auth-left-testimonial">
                <p className="testimonial-text">&quot;NILHub made it incredibly easy to find the right brands for my personal brand. I closed my first deal within a week.&quot;</p>
                <div className="testimonial-author">
                    <div className="testimonial-avatar"></div>
                    <div>
                        <div className="testimonial-name">Maya Johnson</div>
                        <div className="testimonial-role">Basketball · UCLA</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
