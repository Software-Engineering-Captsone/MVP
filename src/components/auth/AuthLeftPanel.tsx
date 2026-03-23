import { NilinkLogoLink } from '@/components/brand/NilinkLogo';

export default function AuthLeftPanel() {
    return (
        <div className="auth-left">
            <NilinkLogoLink href="/" className="auth-left-logo" surface="dark" />

            <div className="auth-left-content">
                <h1>Build partnerships <em>that matter</em></h1>
                <p>Join the marketplace where college athletes and brands connect for authentic, data-driven NIL partnerships.</p>
            </div>

            <div className="auth-left-testimonial">
                <p className="testimonial-text">&quot;NILINK made it incredibly easy to find the right brands for my personal brand. I closed my first deal within a week.&quot;</p>
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
