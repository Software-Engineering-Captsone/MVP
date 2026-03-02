import '@/styles/auth.css';
import { AuthLeftPanel, AuthForm } from '@/components/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NILHub — Sign In',
  description: 'Sign in or create an account on NILHub to start connecting with athletes and brands.',
};

export default function AuthPage() {
  return (
    <div className="auth-page">
      <AuthLeftPanel />
      <AuthForm />
    </div>
  );
}
