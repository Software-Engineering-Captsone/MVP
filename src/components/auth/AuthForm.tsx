"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

    // Form states
    const [signinEmail, setSigninEmail] = useState('');
    const [signinPassword, setSigninPassword] = useState('');
    const [signupFirstName, setSignupFirstName] = useState('');
    const [signupLastName, setSignupLastName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resendEmail, setResendEmail] = useState('');
    const [showResendVerification, setShowResendVerification] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');
        const verified = searchParams.get('verified');
        if (error === 'google_denied') setFormError('Google sign-in was cancelled.');
        else if (error === 'google_failed') setFormError('Google sign-in failed. Please try again.');
        if (verified === 'true') setSuccessMessage('Email verified! You can now sign in.');
    }, [searchParams]);

    const clearMessages = () => {
        setFormError('');
        setSuccessMessage('');
    };

    const handleTabSwitch = (tab: 'signin' | 'signup') => {
        setActiveTab(tab);
        clearMessages();
    };

    const handleGoogleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        window.location.href = `/api/auth/google?role=${role}`;
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: signinEmail,
                    password: signinPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store token
                localStorage.setItem('token', data.token);
                setSuccessMessage('Sign in successful! Redirecting...');
                const destination = data.user.role === 'athlete' ? '/athlete' : '/business';
                setTimeout(() => {
                    router.push(destination);
                }, 1000);
            } else {
                setFormError(data.error || 'Sign in failed');
            }
        } catch (err) {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: signupEmail,
                    password: signupPassword,
                    role,
                    name: `${signupFirstName} ${signupLastName}`,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Please wait for verification.');
                setActiveTab('signin');
                setSignupFirstName('');
                setSignupLastName('');
                setSignupEmail('');
                setSignupPassword('');
            } else {
                setFormError(data.error || 'Sign up failed');
            }
        } catch (err) {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: forgotEmail,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Password reset link sent to your email.');
                setShowForgotPassword(false);
                setForgotEmail('');
            } else {
                setFormError(data.error || 'Failed to send reset email');
            }
        } catch (err) {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        try {
            // For resend, we need to find the user and send a new verification email
            // This would require a separate API endpoint for resending
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: resendEmail,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Verification email sent! Please check your inbox.');
                setShowResendVerification(false);
                setResendEmail('');
            } else {
                setFormError(data.error || 'Failed to resend verification email');
            }
        } catch (err) {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-right">
            <div className="auth-form-container">
                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                        {successMessage}
                    </div>
                )}

                {/* Tab Switcher */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                        onClick={() => handleTabSwitch('signin')}
                    >
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => handleTabSwitch('signup')}
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
                                <input 
                                    type="email" 
                                    id="signin-email" 
                                    placeholder="you@example.com" 
                                    value={signinEmail}
                                    onChange={(e) => setSigninEmail(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="signin-password">Password</label>
                                <div className="password-wrapper">
                                    <input 
                                        type="password" 
                                        id="signin-password" 
                                        placeholder="Enter your password" 
                                        value={signinPassword}
                                        onChange={(e) => setSigninPassword(e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-extras">
                                <label className="form-checkbox">
                                    <input type="checkbox" /> Remember me
                                </label>
                                <a href="#" className="form-link" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>Forgot password?</a>
                            </div>
                            {formError && <p className="error-message">{formError}</p>}
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>

                        <p className="auth-footer-text">
                            Don&apos;t have an account?{' '}
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('signup'); }}>Sign up</a>
                        </p>
                        <p className="auth-footer-text text-sm">
                            Didn&apos;t receive verification email?{' '}
                            <a href="#" onClick={(e) => { e.preventDefault(); setShowResendVerification(true); }}>Resend</a>
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
                                    <input 
                                        type="text" 
                                        id="signup-first" 
                                        placeholder="John" 
                                        value={signupFirstName}
                                        onChange={(e) => setSignupFirstName(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="signup-last">Last Name</label>
                                    <input 
                                        type="text" 
                                        id="signup-last" 
                                        placeholder="Doe" 
                                        value={signupLastName}
                                        onChange={(e) => setSignupLastName(e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="signup-email">Email</label>
                                <input 
                                    type="email" 
                                    id="signup-email" 
                                    placeholder="you@example.com" 
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="signup-password">Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showSignupPassword ? 'text' : 'password'}
                                        id="signup-password"
                                        placeholder="Min. 8 characters"
                                        value={signupPassword}
                                        onChange={(e) => setSignupPassword(e.target.value)}
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
                            {formError && <p className="error-message">{formError}</p>}
                            <button type="submit" className="btn-submit" style={{ marginTop: '8px' }} disabled={loading}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
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

                {/* Forgot Password Modal */}
                {showForgotPassword && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                            <p className="text-gray-600 mb-4">Enter your email address and we'll send you a link to reset your password.</p>
                            
                            <form onSubmit={handleForgotPassword}>
                                <div className="form-group">
                                    <label htmlFor="forgot-email">Email</label>
                                    <input 
                                        type="email" 
                                        id="forgot-email" 
                                        placeholder="you@example.com" 
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                                {formError && <p className="error-message">{formError}</p>}
                                <div className="flex space-x-3 mt-4">
                                    <button type="submit" className="btn-submit flex-1" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowForgotPassword(false); setFormError(''); setForgotEmail(''); }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Resend Verification Modal */}
                {showResendVerification && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                            <h2 className="text-xl font-bold mb-4">Resend Verification Email</h2>
                            <p className="text-gray-600 mb-4">Enter your email address to receive a new verification link.</p>

                            <form onSubmit={handleResendVerification}>
                                <div className="form-group">
                                    <label htmlFor="resend-email">Email</label>
                                    <input
                                        type="email"
                                        id="resend-email"
                                        placeholder="you@example.com"
                                        value={resendEmail}
                                        onChange={(e) => setResendEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                {formError && <p className="error-message">{formError}</p>}
                                <div className="flex space-x-3 mt-4">
                                    <button type="submit" className="btn-submit flex-1" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Verification Email'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowResendVerification(false); setFormError(''); setResendEmail(''); }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
