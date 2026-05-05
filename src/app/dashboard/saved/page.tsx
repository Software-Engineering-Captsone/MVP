import { redirect } from 'next/navigation';

/** Saved athletes/brands moved under Explore tabs; legacy URL keeps working. */
export default function SavedPage() {
  redirect('/dashboard/search');
}
