"use client";

import { useState } from 'react';

function GoogleIcon() {
    return (
        <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

export default function AuthForm() {
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
    const [role, setRole] = useState<'athlete' | 'brand'>('athlete');
    const [showSignupPassword, setShowSignupPassword] = useState(false);

    const handleGoogleAuth = (e: React.MouseEvent) => {
        e.preventDefault();
        alert(`Google Auth triggered!\nRole: ${role}\n\nThis will integrate with your Google OAuth backend.`);
    };

    const handleSignIn = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Sign in attempt:\n\nThis will connect to your auth backend.');
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Sign up attempt:\nRole: ${role}\n\nThis will connect to your auth backend.`);
    };

    return (
        <div className="auth-right">
            <div className="auth-form-container">
                {/* Tab Switcher */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('signin')}
                    >
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('signup')}
                    >
                        Sign Up
                    </button>
                </div>

                {/* ===== SIGN IN ===== */}
                {activeTab === 'signin' && (
                    <div className="form-view active">
                        <div className="auth-header">
                            <h2>Welcome back</h2>
                            <p>Sign in to your account to continue</p>
                        </div>

                        <button className="btn-google" onClick={handleGoogleAuth}>
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        <div className="auth-divider"><span>or</span></div>

                        <form onSubmit={handleSignIn}>
                            <div className="form-group">
                                <label htmlFor="signin-email">Email</label>
                                <input type="email" id="signin-email" placeholder="you@example.com" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="signin-password">Password</label>
                                <div className="password-wrapper">
                                    <input type="password" id="signin-password" placeholder="Enter your password" required />
                                </div>
                            </div>
                            <div className="form-extras">
                                <label className="form-checkbox">
                                    <input type="checkbox" /> Remember me
                                </label>
                                <a href="#" className="form-link">Forgot password?</a>
                            </div>
                            <button type="submit" className="btn-submit">Sign In</button>
                        </form>

                        <p className="auth-footer-text">
                            Don&apos;t have an account?{' '}
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('signup'); }}>Sign up</a>
                        </p>
                    </div>
                )}

                {/* ===== SIGN UP ===== */}
                {activeTab === 'signup' && (
                    <div className="form-view active">
                        <div className="auth-header">
                            <h2>Create your account</h2>
                            <p>Get started with NILHub in seconds</p>
                        </div>

                        {/* Role Selection */}
                        <div className="role-selection">
                            <label
                                className={`role-card ${role === 'athlete' ? 'selected' : ''}`}
                                onClick={() => setRole('athlete')}
                            >
                                <input type="radio" name="role" value="athlete" checked={role === 'athlete'} onChange={() => setRole('athlete')} />
                                <div className="role-label">Athlete</div>
                                <div className="role-desc">Monetize your personal brand</div>
                            </label>
                            <label
                                className={`role-card ${role === 'brand' ? 'selected' : ''}`}
                                onClick={() => setRole('brand')}
                            >
                                <input type="radio" name="role" value="brand" checked={role === 'brand'} onChange={() => setRole('brand')} />
                                <div className="role-label">Brand</div>
                                <div className="role-desc">Find athletes for campaigns</div>
                            </label>
                        </div>

                        <button className="btn-google" onClick={handleGoogleAuth}>
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        <div className="auth-divider"><span>or</span></div>

                        <form onSubmit={handleSignUp}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="signup-first">First Name</label>
                                    <input type="text" id="signup-first" placeholder="John" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="signup-last">Last Name</label>
                                    <input type="text" id="signup-last" placeholder="Doe" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="signup-email">Email</label>
                                <input type="email" id="signup-email" placeholder="you@example.com" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="signup-password">Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showSignupPassword ? 'text' : 'password'}
                                        id="signup-password"
                                        placeholder="Min. 8 characters"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                                    >
                                        {showSignupPassword ? '🔒' : '👁'}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" className="btn-submit" style={{ marginTop: '8px' }}>Create Account</button>
                        </form>

                        <p className="auth-footer-text">
                            Already have an account?{' '}
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('signin'); }}>Sign in</a>
                        </p>

                        <p className="auth-terms">
                            By creating an account, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
