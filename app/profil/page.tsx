import ProtectedRoute from '@/components/ProtectedRoute';
import ProfileTabs from '@/components/profile/ProfileTabs';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lade Profil-Daten
  const { data: profile } = user
    ? await supabase
        .from('user_profile')
        .select('*')
        .eq('id', user.id)
        .single()
    : { data: null };

  // Lade User-Daten für E-Mail
  const { data: userData } = user
    ? await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single()
    : { data: null };

  // Lade E-Mail-Präferenzen
  const { data: emailPreferences } = user
    ? await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
    : { data: null };

  return (
    <ProtectedRoute>
      <section className="page-section">
        <div className="container">
          <div className="page-intro">
            <h1 className="page-intro-title">Mein Profil</h1>
            <p className="page-intro-text">
              Verwalte deine persönlichen Daten und Einstellungen
            </p>
          </div>

          <div className="module-card" style={{ marginTop: 'var(--spacing-2xl)' }}>
            <ProfileTabs 
              initialProfile={profile}
              userEmail={userData?.email || user?.email || ''}
              initialEmailPreferences={emailPreferences}
            />
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
}
