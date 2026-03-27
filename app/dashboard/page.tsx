import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getDashboardStats } from '@/lib/dashboard';
import { getSubscriptionStatus } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';
import CheckoutSessionHandler from '@/components/CheckoutSessionHandler';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const subscription = await getSubscriptionStatus();

  // Lade User-Daten mit Kaufinformationen
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userRow } = user
    ? await supabase
        .from('users')
        .select('credits, last_credits_purchase_at')
        .eq('id', user.id)
        .single()
    : { data: null };

  return (
    <ProtectedRoute>
      <CheckoutSessionHandler />
      <section className="dashboard-section">
        <div className="container">
          <div className="page-intro">
            <h1 className="page-intro-title">Mein Bereich</h1>
            <p className="page-intro-text">
              Überwache deine Korrekturen, halte dein Abonnement aktuell und wechsle
              direkt in den Upload- oder Ergebnisbereich.
            </p>
          </div>

          {/* Beta Banner */}
          <div className="beta-banner">
            <div className="beta-status">
              <span className="beta-dot" />
              <div>
                <p className="beta-status-title">Korrekturpilot ist in der Beta-Phase</p>
                <p className="beta-status-description">
                  Wir arbeiten kontinuierlich an Verbesserungen. Dein Feedback ist uns wichtig!
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Gesamt Korrekturen</div>
              <div className="dashboard-stat-value">{stats.completedCorrections}</div>
              <div className="dashboard-stat-trend">Alle Zeiten</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Diese Woche</div>
              <div className="dashboard-stat-value">{stats.thisWeek}</div>
              <div className="dashboard-stat-trend">Letzte 7 Tage</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Laufend</div>
              <div className="dashboard-stat-value">{stats.runningAnalyses}</div>
              <div className="dashboard-stat-trend">In Bearbeitung</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">Aktive Horizonte</div>
              <div className="dashboard-stat-value">{stats.activeExpectationHorizons}</div>
              <div className="dashboard-stat-trend">Erwartungshorizonte</div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="cta-actions" style={{ marginTop: 'var(--spacing-xl)' }}>
            <Link href="/correction" className="primary-button">
              <span>Neue Korrektur starten</span>
            </Link>
          </div>

          {/* Credits & Abonnement */}
          <div className="dashboard-section-card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Credits & Abonnement</h2>
            </div>
            <div className="beta-status">
              <span className="beta-dot" />
              <div>
                {userRow?.last_credits_purchase_at ? (
                  <div style={{ borderRadius: 'var(--radius-lg)', backgroundColor: '#fefce8', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <p style={{ fontWeight: '600', color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-xs)' }}>
                      Du hast am{' '}
                      {new Date(userRow.last_credits_purchase_at).toLocaleDateString('de-DE')}{' '}
                      ein Paket gekauft. Aktuell sind {userRow.credits ?? 0} Credits verfügbar.
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                      Credits verlieren keine Gültigkeit und stehen dir so lange zur
                      Verfügung, bis sie vollständig aufgebraucht sind.
                    </p>
                  </div>
                ) : (
                  <div style={{ borderRadius: 'var(--radius-lg)', backgroundColor: '#fefce8', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <p style={{ fontWeight: '600', color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-xs)' }}>Kein aktives Paket</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                      Du nutzt aktuell nur deine kostenlosen Start‑Credits. Für größere Klassen kannst du ein Klassensatz‑Paket aktivieren.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="cta-actions" style={{ marginTop: 'var(--spacing-lg)' }}>
              <Link href="/checkout" className="secondary-button">
                <span>{subscription.hasActiveSubscription ? 'Plan ändern' : 'Paket wählen'}</span>
              </Link>
            </div>
          </div>

          {/* Letzte Korrekturen */}
          <div className="dashboard-section-card">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Letzte Korrekturen</h2>
              <Link href="/results" className="text-link">
                Zu den Ergebnissen
              </Link>
            </div>
            <div className="dashboard-table">
              {stats.recentCorrections.length > 0 ? (
                stats.recentCorrections.map((item) => (
                  <div key={item.id} className="dashboard-table-row">
                    <div>
                      <p className="dashboard-table-title">{item.subject}</p>
                      <p className="dashboard-table-subtitle">
                        Thema: {item.topic} · {new Date(item.date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <span className="dashboard-table-chip">{item.students} Arbeiten</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-table-row">
                  <div>
                    <p className="dashboard-table-title">Noch keine Korrekturen</p>
                    <p className="dashboard-table-subtitle">Starte deine erste Korrektur im Upload-Bereich.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
}
