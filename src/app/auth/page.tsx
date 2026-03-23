import '@/styles/auth.css';
import { AuthLeftPanel, AuthForm } from '@/components/auth';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'NILINK — Sign In',
  description: 'Sign in or create an account on NILINK to start connecting with athletes and brands.',
};

export default function AuthPage() {
  return (
    <div className="auth-page">
      <AuthLeftPanel />
      <Suspense fallback={<div className="auth-right"><div className="auth-form-container">Loading...</div></div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
