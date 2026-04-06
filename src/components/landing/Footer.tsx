import Link from 'next/link';
import { NilinkLogoLink } from '@/components/brand/NilinkLogo';

export default function Footer() {
    return (
        <footer>
            <div className="footer-grid">
                <div>
                    <NilinkLogoLink href="/" className="nav-logo" surface="light" />
                    <p className="footer-desc">The modern NIL marketplace connecting college athletes with brands for partnerships that deliver real results.</p>
                </div>
                <div className="footer-col"><h4>Product</h4><a href="#">Features</a><Link href="/watch-demo">Watch demo</Link><a href="#">For Athletes</a><a href="#">For Brands</a><Link href="/#pricing">Pricing</Link></div>
                <div className="footer-col"><h4>Company</h4><a href="#">About</a><a href="#">Blog</a><a href="#">Careers</a><a href="#">Contact</a></div>
                <div className="footer-col"><h4>Legal</h4><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">NIL Policy</a></div>
            </div>
            <div className="footer-bottom">
                <span>&copy; 2026 NILINK. All rights reserved.</span>
                <span>Built for athletes, powered by data.</span>
            </div>
        </footer>
    );
}
