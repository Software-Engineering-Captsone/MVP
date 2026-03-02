import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="nav-dark">
            <div className="nav-left">
                <Link href="/" className="nav-logo">
                    <div className="nav-logo-mark"></div>
                    <span className="nav-logo-text">NILHub</span>
                </Link>
                <ul className="nav-menu">
                    <li><a href="#how">How it works</a></li>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#athletes">For Athletes</a></li>
                    <li><a href="#brands">For Brands</a></li>
                    <li><a href="#">Pricing</a></li>
                </ul>
            </div>
            <div className="nav-right">
                <Link href="/auth" className="btn-ghost-dark">Log in</Link>
                <Link href="/auth" className="btn-pill btn-white">Get started free</Link>
            </div>
        </nav>
    );
}
