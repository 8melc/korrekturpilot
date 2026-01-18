'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import EmailAuthForm from '@/components/AuthForm';

export default function AuthPageClient() {
  const [emailMode, setEmailMode] = useState<'login' | 'signup' | 'forgot-password'>('signup');
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <section className="page-section">
      <div className="container">
        <div style={{ 
          maxWidth: '32rem', 
          margin: '0 auto',
          padding: 'var(--spacing-2xl) 0'
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: 'var(--spacing-2xl)',
          }}>
            <EmailAuthForm 
              mode={emailMode} 
              onClose={undefined} // Kein Close-Button auf eigener Seite
              onSwitchMode={() => {
                if (emailMode === 'login') {
                  setEmailMode('signup');
                } else if (emailMode === 'signup') {
                  setEmailMode('login');
                } else {
                  setEmailMode('login');
                }
              }}
              onForgotPassword={() => setEmailMode('forgot-password')}
              onGoogleSignIn={handleGoogleSignIn}
            />
          </div>
        </div>
      </div>
    </section>
  );
}








