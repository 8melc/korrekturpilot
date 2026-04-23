import Link from 'next/link';
import SupportForm from '@/components/SupportForm';
import { getCurrentUser } from '@/lib/auth';

export default async function SupportPage() {
  const user = await getCurrentUser();

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-intro">
          <h1 className="page-intro-title">Support &amp; Rückfragen</h1>
          <p className="page-intro-text">
            Melde Fragen, Probleme oder Produktfeedback strukturiert an einer Stelle. So können wir schneller und gezielter reagieren.
          </p>
        </div>

        <div
          className="module-card"
          style={{
            marginTop: 'var(--spacing-xl)',
            padding: 'var(--spacing-xl)',
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.06), rgba(59, 130, 246, 0.08))',
            border: '1px solid rgba(59, 130, 246, 0.18)',
          }}
        >
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Was du hier erwarten kannst</h2>
          <div style={{ display: 'grid', gap: 'var(--spacing-sm)', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
            <p><strong>Antwortzeit:</strong> Montag bis Freitag in der Regel innerhalb von 24 bis 48 Stunden.</p>
            <p><strong>Beta-Phase:</strong> Wir priorisieren konkrete, nachvollziehbare Rückmeldungen direkt aus dem Produkt.</p>
            <p><strong>Kontaktadresse:</strong> Falls nötig erreichst du uns zusätzlich unter <a href="mailto:kontakt@korrekturpilot.de" className="text-link">kontakt@korrekturpilot.de</a>.</p>
          </div>
        </div>

        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          {user ? (
            <SupportForm userEmail={user.email ?? null} />
          ) : (
            <div className="module-card" style={{ padding: 'var(--spacing-xl)' }}>
              <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Bitte zuerst einloggen</h2>
              <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
                Das Support-Formular ist in dieser Version nur für eingeloggte Nutzer verfügbar. So können wir deine Anfrage sauber deinem Konto und gegebenenfalls einer Korrektur zuordnen.
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <Link href="/auth" className="primary-button">
                  Einloggen
                </Link>
                <a href="mailto:kontakt@korrekturpilot.de" className="secondary-button">
                  Kontakt per E-Mail
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Kurze Hinweise vor dem Absenden</h2>
          <ul style={{ paddingLeft: 'var(--spacing-xl)', color: 'var(--color-gray-700)', lineHeight: 1.7, marginBottom: 0 }}>
            <li>Beschreibe möglichst konkret, an welcher Stelle das Problem auftritt.</li>
            <li>Nenne wenn möglich Korrektur-ID oder Dateiname.</li>
            <li>Personenbezogene Daten bitte nicht frei in die Texte schreiben.</li>
            <li>Wenn du einen Screenshot hast, erwähne das im Formular. Wir fragen ihn bei Bedarf nach.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
