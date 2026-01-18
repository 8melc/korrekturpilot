import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="page-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h1 className="page-intro-title" style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
            404
          </h1>
          <h2 className="page-intro-title" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>
            Seite nicht gefunden
          </h2>
          <p className="page-intro-text" style={{ marginBottom: 'var(--spacing-xl)' }}>
            Die gesuchte Seite existiert nicht oder wurde verschoben. Nutze die Links unten, um zurück zur Startseite zu navigieren.
          </p>
        </div>

        <div className="module-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
            <Link href="/" className="primary-button" style={{ width: '100%', justifyContent: 'center' }}>
              Zur Startseite
            </Link>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/#pricing" className="secondary-button">
                Preise
              </Link>
              <Link href="/#faq" className="secondary-button">
                FAQ
              </Link>
              <Link href="/#wie-es-funktioniert" className="secondary-button">
                So funktioniert's
              </Link>
              <a href="mailto:kontakt@korrekturpilot.de" className="secondary-button">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}







