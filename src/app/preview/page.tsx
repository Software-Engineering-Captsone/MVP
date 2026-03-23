import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign in — NILINK',
  description: 'Sign in to open your dashboard.',
};

/** Legacy URL — use /auth. Dashboard uses your JWT role (athlete vs brand). */
export default function PreviewPage() {
  redirect('/auth');
}
