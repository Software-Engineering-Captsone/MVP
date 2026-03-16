import { redirect } from 'next/navigation';

export default function AthletePage() {
  redirect('/dashboard?accountType=athlete');
}
