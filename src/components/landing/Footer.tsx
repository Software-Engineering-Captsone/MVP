import Link from 'next/link';
import { NilinkLogoLink } from '@/components/brand/NilinkLogo';
import WaitlistButton from './WaitlistButton';

export default function Footer() {
    return (
        <footer>
            <div className="footer-grid">
                <div>
                    <NilinkLogoLink href="/" className="nav-logo" surface="light" />
                    <p className="footer-desc">A capstone MVP prototype exploring how college athletes and brands can manage NIL partnerships in one place.</p>
                </div>
                <div className="footer-col">
                    <h4>Product</h4>
                    <a href="#features">Features</a>
                    <a href="#athletes">For Athletes</a>
                    <a href="#brands">For Brands</a>
                </div>
                <div className="footer-col">
                    <h4>Company</h4>
                    <Link href="/talk-to-sales">Contact</Link>
                    <WaitlistButton className="footer-link-button">Join waitlist</WaitlistButton>
                </div>
                <div className="footer-col">
                    <h4>Legal</h4>
                    <span className="footer-link-disabled">Privacy Policy <em>coming soon</em></span>
                    <span className="footer-link-disabled">Terms of Service <em>coming soon</em></span>
                    <span className="footer-link-disabled">NIL Policy <em>coming soon</em></span>
                </div>
            </div>
            <div className="footer-bottom">
                <span>&copy; 2026 NILINK Capstone MVP. Prototype for academic demonstration.</span>
                <span>Not a launched commercial service.</span>
            </div>
        </footer>
    );
}
