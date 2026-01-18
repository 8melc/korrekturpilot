import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="page-intro">
          <h1 className="page-intro-title">Datenschutzerklärung – KorrekturPilot</h1>
          <p className="page-intro-text">
            Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })} | 
            Diese Datenschutzerklärung gilt für die Beta-Phase von KorrekturPilot.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>1. Verantwortlicher</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Verantwortlicher für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <p style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}>gannaca GmbH & Co. KG</p>
            <p>Luftschiff-Platz 26</p>
            <p>50733 Köln</p>
            <p>Deutschland</p>
            <p style={{ marginTop: 'var(--spacing-sm)' }}>
              E-Mail: <a href="mailto:kontakt@korrekturpilot.de" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>kontakt@korrekturpilot.de</a>
            </p>
          </div>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>2. Datenverarbeitung im Rahmen von KorrekturPilot</h2>
          
          <h3 style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>2.1 Upload von PDF-Dateien</h3>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wenn du Erwartungshorizonte oder Klausuren als PDF-Dateien hochlädst, werden diese Dateien auf unseren Servern in Deutschland gespeichert und verarbeitet. Die Dateien enthalten möglicherweise personenbezogene Daten (z.B. Schülernamen, Handschriften).
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Speicherdauer:</strong> Die hochgeladenen Dateien werden gelöscht, sobald sie für die Korrektur nicht mehr benötigt werden oder du sie manuell löschst. In der Beta-Phase empfehlen wir, Dateien nach Abschluss der Korrektur zu löschen.
          </p>

          <h3 style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>2.2 E-Mail-Kommunikation</h3>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wenn du uns per E-Mail kontaktierst, speichern wir deine E-Mail-Adresse und den Inhalt deiner Nachricht, um deine Anfrage zu beantworten.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse an der Beantwortung von Anfragen)
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Speicherdauer:</strong> E-Mails werden gelöscht, sobald sie für die Bearbeitung nicht mehr erforderlich sind, spätestens nach 3 Jahren.
          </p>

          <h3 style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>2.3 Server-Logs</h3>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Beim Besuch unserer Website werden automatisch folgende Daten in Server-Log-Dateien gespeichert:
          </p>
          <ul style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-xl)' }}>
            <li>IP-Adresse</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Angeforderte Datei/URL</li>
            <li>Browser-Typ und -Version</li>
            <li>Betriebssystem</li>
          </ul>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse an der Sicherstellung der Funktionsfähigkeit und Sicherheit der Website)
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Speicherdauer:</strong> Server-Logs werden nach 7 Tagen automatisch gelöscht.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>3. Serverstandort</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Alle Daten werden auf Servern in Deutschland verarbeitet und gespeichert. Eine Datenübertragung in Drittländer außerhalb der EU findet nicht statt.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>4. Betroffenenrechte</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Du hast folgende Rechte bezüglich deiner personenbezogenen Daten:
          </p>
          <ul style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-xl)' }}>
            <li><strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Du kannst Auskunft über die von uns gespeicherten personenbezogenen Daten verlangen.</li>
            <li><strong>Berichtigungsrecht (Art. 16 DSGVO):</strong> Du kannst die Berichtigung unrichtiger Daten verlangen.</li>
            <li><strong>Löschungsrecht (Art. 17 DSGVO):</strong> Du kannst die Löschung deiner Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</li>
            <li><strong>Einschränkung der Verarbeitung (Art. 18 DSGVO):</strong> Du kannst die Einschränkung der Verarbeitung verlangen.</li>
            <li><strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Du kannst der Verarbeitung deiner Daten widersprechen, wenn diese auf berechtigtem Interesse beruht.</li>
            <li><strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Du kannst verlangen, dass wir dir deine Daten in einem strukturierten, gängigen Format übermitteln.</li>
          </ul>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Um deine Rechte wahrzunehmen, kontaktiere uns bitte unter <a href="mailto:kontakt@korrekturpilot.de" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>kontakt@korrekturpilot.de</a>.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>5. Cookies</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wir setzen nur technisch notwendige Cookies, die für die Funktionsfähigkeit der Website erforderlich sind. Diese Cookies werden automatisch gelöscht, wenn du den Browser schließt.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Für nicht-essentielle Cookies (z.B. Analytics) holen wir deine Einwilligung ein. Du kannst deine Cookie-Einstellungen jederzeit ändern.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>6. Datensicherheit</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wir setzen technische und organisatorische Maßnahmen ein, um deine Daten vor unbefugtem Zugriff, Verlust oder Zerstörung zu schützen. Dazu gehören:
          </p>
          <ul style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-xl)' }}>
            <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
            <li>Zugriffskontrollen auf Server-Ebene</li>
            <li>Regelmäßige Sicherheitsupdates</li>
            <li>Backup-Systeme</li>
          </ul>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>7. Beschwerderecht</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Du hast das Recht, eine Beschwerde bei einer Aufsichtsbehörde einzureichen, wenn du der Ansicht bist, dass die Verarbeitung deiner personenbezogenen Daten gegen die DSGVO verstößt.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Zuständige Aufsichtsbehörde für uns ist:
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen<br />
            Postfach 20 04 44<br />
            40102 Düsseldorf<br />
            Website: <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>https://www.ldi.nrw.de</a>
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>8. Beta-Phase: Besondere Hinweise</h2>
          <p style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning)' }}>
            <strong>Wichtig:</strong> Da sich KorrekturPilot in der Beta-Phase befindet, empfehlen wir dir dringend, personenbezogene Daten (insbesondere Schülernamen) vor dem Upload zu anonymisieren. Du kannst die Namen auf den Klausuren schwärzen oder mit Post-its abdecken, bevor du sie scannst. Nutze neutrale Dateinamen (z.B. "Klausur_01.pdf" statt "Max_Mustermann.pdf").
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Diese Empfehlung dient deinem zusätzlichen Schutz und der Minimierung von Datenschutzrisiken während der Beta-Phase.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>9. Kontakt</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Bei Fragen zum Datenschutz kannst du uns jederzeit kontaktieren:
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            E-Mail: <a href="mailto:kontakt@korrekturpilot.de" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>kontakt@korrekturpilot.de</a>
          </p>
        </div>

        <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
          <Link href="/" className="secondary-button">
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    </section>
  );
}







