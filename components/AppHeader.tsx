'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import AuthButton from './AuthButton';
import CreditsDisplay from './CreditsDisplay';

const NAV_LINKS_LOGGED_IN = [
  { href: '/correction', label: 'Korrektur starten' },
  { href: '/results', label: 'Ergebnisse' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profil', label: 'Profil' },
];

const NAV_LINKS_LOGGED_OUT = [
  { href: '#wie-es-funktioniert', label: 'So funktioniert\'s' },
  { href: '#pricing', label: 'Preise' },
  { href: '#faq', label: 'FAQ' },
];

const isActivePath = (pathname: string, href: string) => {
  if (href.includes('#')) {
    return pathname === '/';
  }
  if (href === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(href);
};

export default function AppHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);
        setLoading(false);
      } catch (err) {
        setUser(null);
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const navLinks = user ? NAV_LINKS_LOGGED_IN : NAV_LINKS_LOGGED_OUT;
  const supportLink = (
    <a
      href="/support"
      target="_blank"
      rel="noopener noreferrer"
      className="secondary-button"
      style={{
        padding: '0.65rem 0.95rem',
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
      }}
    >
      Support
    </a>
  );

  return (
    <header className={`header ${mobileMenuOpen ? 'mobile-nav-open' : ''}`}>
      <div className="container">
        <div className="header-content">
          {/* Links: Logo */}
          <Link href="/" className="logo" aria-label="Zur Startseite" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <svg
              className="logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="logo-text">KorrekturPilot</span>
            <span className="beta-badge" style={{ fontSize: '0.625rem', padding: '2px 6px', backgroundColor: 'rgba(30, 58, 138, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Beta
            </span>
          </Link>

          <nav className="nav desktop-nav desktop-only" aria-label="Hauptnavigation">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActivePath(pathname, href) ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
            <div className="desktop-inline-actions">
              {user && <CreditsDisplay />}
              {supportLink}
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className={`mobile-nav-panel ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-panel__inner">
          <nav className="mobile-nav" aria-label="Hauptnavigation">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActivePath(pathname, href) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mobile-actions">
            {user && <CreditsDisplay />}
            {supportLink}
            <AuthButton />
          </div>
        </div>
      </div>
      <div
        className={`mobile-nav-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />
    </header>
  );
}
