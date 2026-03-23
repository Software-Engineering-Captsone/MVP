import { redirect } from 'next/navigation';

/** Legacy dev entry — dashboard is gated by auth and role from JWT. */
export default function PreviewPage() {
  redirect('/auth');
}
