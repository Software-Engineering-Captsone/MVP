import { NilinkLogoLink } from '@/components/brand/NilinkLogo';

export default function Footer() {
    return (
        <footer>
            <div className="footer-grid">
                <div>
                    <NilinkLogoLink href="/" className="nav-logo" surface="light" />
                    <p className="footer-desc">A capstone MVP prototype exploring how college athletes and brands can manage NIL partnerships in one place.</p>
                </div>
                <div className="footer-col"><h4>Product</h4><a href="#">Features</a><a href="#">For Athletes</a><a href="#">For Brands</a><a href="#">Pricing</a></div>
                <div className="footer-col"><h4>Company</h4><a href="#">About</a><a href="#">Blog</a><a href="#">Careers</a><a href="#">Contact</a></div>
                <div className="footer-col"><h4>Legal</h4><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">NIL Policy</a></div>
            </div>
            <div className="footer-bottom">
                <span>&copy; 2026 NILINK Capstone MVP. Prototype for academic demonstration.</span>
                <span>Not a launched commercial service.</span>
            </div>
        </footer>
    );
}
