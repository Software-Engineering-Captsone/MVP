"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
    const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
    const [forgotOtp, setForgotOtp] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [forgotCooldownUntil, setForgotCooldownUntil] = useState<number>(0);
    const [forgotCooldownRemaining, setForgotCooldownRemaining] = useState<number>(0);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [showResendVerification, setShowResendVerification] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const resolvePostAuthPath = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return '/dashboard';

        const { data, error } = await supabase
            .from('profiles')
            .select('onboarding_completed_at')
            .eq('id', user.id)
            .maybeSingle<{ onboarding_completed_at: string | null }>();

        if (error) return '/dashboard';
        return data?.onboarding_completed_at ? '/dashboard' : '/dashboard/onboarding';
    };

    useEffect(() => {
        const error = searchParams.get('error');
        const verified = searchParams.get('verified');
        const mode = searchParams.get('mode');
        const reset = searchParams.get('reset');

        if (mode === 'signup') setActiveTab('signup');
        if (mode === 'signin') setActiveTab('signin');

        if (error === 'google_denied') setFormError('Google sign-in was cancelled.');
        else if (error === 'google_failed') setFormError('Google sign-in failed. Please try again.');
        else if (error === 'auth_callback_failed') setFormError('Authentication failed. Please try again.');
        if (verified === 'true') setSuccessMessage('Email verified! You can now sign in.');
        if (reset === 'success') setSuccessMessage('Password updated. Please sign in with your new password.');
    }, [searchParams]);

    // Tick down the forgot-password cooldown so the button label
    // updates once per second while the timer is active. Avoids
    // burning Supabase's per-project recovery email rate limit.
    useEffect(() => {
        if (!forgotCooldownUntil) {
            setForgotCooldownRemaining(0);
            return;
        }
        const update = () => {
            const remaining = Math.max(0, Math.ceil((forgotCooldownUntil - Date.now()) / 1000));
            setForgotCooldownRemaining(remaining);
            if (remaining <= 0) setForgotCooldownUntil(0);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [forgotCooldownUntil]);

    const clearMessages = () => {
        setFormError('');
        setSuccessMessage('');
    };

    const handleTabSwitch = (tab: 'signin' | 'signup') => {
        setActiveTab(tab);
        clearMessages();
    };

    /* ────────────── Google OAuth via Supabase ────────────── */
    const handleGoogleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/onboarding&role=${role}`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                // We pass the selected role as metadata so the DB trigger
                // can pick it up when creating the profile row.
                // NOTE: For OAuth, the role is stored after redirect via
                // the profile upsert in the callback or via a separate call.
            },
        });

        if (error) {
            setFormError(error.message);
        }
    };

    /* ────────────── Email/Password Sign In ────────────── */
    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: signinEmail,
                password: signinPassword,
            });

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    setFormError('Your email is not verified yet. Check your inbox or resend the verification email below.');
                } else if (error.message.includes('Invalid login credentials')) {
                    setFormError('Invalid email or password.');
                } else {
                    setFormError(error.message);
                }
            } else {
                setSuccessMessage('Sign in successful! Redirecting...');
                setTimeout(async () => {
                    router.push(await resolvePostAuthPath());
                    router.refresh();
                }, 600);
            }
        } catch {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    /* ────────────── Email/Password Sign Up ────────────── */
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        const fullName = `${signupFirstName.trim()} ${signupLastName.trim()}`;

        try {
            // Both roles land on the onboarding page after email verification.
            // The dashboard's onboarding gate also redirects there for any
            // user with a null onboarding_completed_at, so this is belt-and-
            // suspenders — but it avoids an extra redirect on first sign-in.
            const postVerifyPath = '/dashboard/onboarding';
            const { error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=${postVerifyPath}`,
                    data: {
                        full_name: fullName,
                        role: role,
                    },
                },
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    setFormError('An account with this email already exists.');
                } else {
                    setFormError(error.message);
                }
            } else {
                setSuccessMessage(
                    'Account created! Check your email for a verification link to activate your account.'
                );
                setActiveTab('signin');
                setSignupFirstName('');
                setSignupLastName('');
                setSignupEmail('');
                setSignupPassword('');
            }
        } catch {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const resetForgotModalState = () => {
        setForgotStep('email');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
    };

    const closeForgotModal = () => {
        setShowForgotPassword(false);
        setFormError('');
        resetForgotModalState();
    };

    const sendForgotPasswordCode = async () => {
        if (loading || forgotCooldownRemaining > 0) return;
        const email = forgotEmail.trim();
        if (!email) {
            setFormError('Please enter your email address.');
            return;
        }
        setLoading(true);
        clearMessages();

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                setFormError(error.message);
                return;
            }
            setSuccessMessage(
                "If an account exists for that email, we've sent a password reset code. Check your inbox and spam folder."
            );
            setForgotStep('otp');
            setForgotOtp('');
            setForgotCooldownUntil(Date.now() + 60_000);
        } catch {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    /* ────────────── Forgot Password (OTP) ────────────── */
    const handleForgotPasswordRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendForgotPasswordCode();
    };

    const handleForgotPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        clearMessages();

        const token = forgotOtp.trim();
        if (!token) {
            setFormError('Enter the 6-digit reset code from your email.');
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            setFormError('Passwords do not match.');
            return;
        }
        if (forgotNewPassword.length < 8) {
            setFormError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: forgotEmail.trim(),
                token,
                type: 'recovery',
            });
            if (verifyError) {
                setFormError(verifyError.message);
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: forgotNewPassword,
            });
            if (updateError) {
                setFormError(updateError.message);
                return;
            }

            try {
                await supabase.auth.signOut();
            } catch {
                // Best effort. We still continue to the signed-out auth view.
            }
            closeForgotModal();
            setSuccessMessage('Password updated. Please sign in with your new password.');
        } catch {
            setFormError('Network error');
        } finally {
            setLoading(false);
        }
    };

    /* ────────────── Resend Verification ────────────── */
    const handleResendVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: verificationEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/onboarding`,
                },
            });

            if (error) {
                setFormError(error.message);
            } else {
                setSuccessMessage('Verification email sent! Please check your inbox.');
                setShowResendVerification(false);
                setVerificationEmail('');
            }
        } catch {
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
                                <a
                                    href="#"
                                    className="form-link"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setFormError('');
                                        setForgotStep('email');
                                        setForgotOtp('');
                                        setForgotNewPassword('');
                                        setForgotConfirmPassword('');
                                        setShowForgotPassword(true);
                                    }}
                                >
                                    Forgot password?
                                </a>
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
                            <p>Get started with NILINK in seconds</p>
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
                            {forgotStep === 'email' ? (
                                <>
                                    <p className="text-gray-600 mb-4">
                                        Enter your account email and we&apos;ll send you a 6-digit password reset code.
                                    </p>
                                    <form onSubmit={handleForgotPasswordRequestCode}>
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
                                            <button
                                                type="submit"
                                                className="btn-submit flex-1"
                                                disabled={loading || forgotCooldownRemaining > 0}
                                            >
                                                {loading
                                                    ? 'Sending...'
                                                    : forgotCooldownRemaining > 0
                                                        ? `Resend in ${forgotCooldownRemaining}s`
                                                        : 'Send Reset Code'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={closeForgotModal}
                                                className="btn-secondary flex-1"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-600 mb-4">
                                        Enter the 6-digit code from your email and choose a new password.
                                    </p>
                                    <form onSubmit={handleForgotPasswordReset}>
                                        <div className="form-group">
                                            <label htmlFor="forgot-code">Reset Code</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                id="forgot-code"
                                                placeholder="123456"
                                                value={forgotOtp}
                                                onChange={(e) => setForgotOtp(e.target.value)}
                                                autoComplete="one-time-code"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="forgot-new-password">New Password</label>
                                            <input
                                                type="password"
                                                id="forgot-new-password"
                                                placeholder="Min. 8 characters"
                                                value={forgotNewPassword}
                                                onChange={(e) => setForgotNewPassword(e.target.value)}
                                                minLength={8}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="forgot-confirm-password">Confirm Password</label>
                                            <input
                                                type="password"
                                                id="forgot-confirm-password"
                                                placeholder="Re-enter your new password"
                                                value={forgotConfirmPassword}
                                                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                                minLength={8}
                                                required
                                            />
                                        </div>
                                        {formError && <p className="error-message">{formError}</p>}
                                        <div className="flex space-x-3 mt-4">
                                            <button type="submit" className="btn-submit flex-1" disabled={loading}>
                                                {loading ? 'Resetting...' : 'Reset Password'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={closeForgotModal}
                                                className="btn-secondary flex-1"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="form-link mt-3"
                                            disabled={loading || forgotCooldownRemaining > 0}
                                            onClick={sendForgotPasswordCode}
                                        >
                                            {forgotCooldownRemaining > 0
                                                ? `Resend code in ${forgotCooldownRemaining}s`
                                                : 'Resend code'}
                                        </button>
                                    </form>
                                </>
                            )}
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
                                        value={verificationEmail}
                                        onChange={(e) => setVerificationEmail(e.target.value)}
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
                                        onClick={() => { setShowResendVerification(false); setFormError(''); setVerificationEmail(''); }}
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
