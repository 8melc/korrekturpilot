import Link from 'next/link';

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <p className="footer-logo">KorrekturPilot</p>
          </div>
          <div className="footer-links">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutzerklärung</Link>
            <Link href="/agb">AGB (Beta)</Link>
            <Link href="/checkout">Preise &amp; Lizenzen</Link>
            <Link href="/beispielauswertung">Beispielauswertung</Link>
            <Link href="/support">Support</Link>
          </div>
          <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            <p>&copy; {currentYear} KorrekturPilot | Beta-Version | Entwickelt für Lehrkräfte in Deutschland</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
