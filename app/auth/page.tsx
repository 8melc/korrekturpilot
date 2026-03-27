import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthPageClient from './AuthPageClient';

export const dynamic = 'force-dynamic';

export default async function AuthPage() {
  // Wenn User bereits eingeloggt ist, redirecte zu Dashboard
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  // Wenn nicht eingeloggt, zeige Auth-UI
  return <AuthPageClient />;
}
