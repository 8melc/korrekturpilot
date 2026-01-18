import Link from 'next/link';

export default function AGBPage() {
  const currentDate = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-intro">
          <h1 className="page-intro-title">Allgemeine Geschäftsbedingungen (Beta)</h1>
          <p className="page-intro-text">
            Stand: {currentDate} | Diese AGB gelten für die Beta-Phase von KorrekturPilot.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>1. Vertragsgegenstand</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            KorrekturPilot ist eine Software-as-a-Service (SaaS) Lösung zur automatisierten Korrektur von handschriftlichen Klausuren. Der Service umfasst:
          </p>
          <ul style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-xl)' }}>
            <li>Automatische Handschriftenerkennung (OCR)</li>
            <li>Abgleich von Schülerantworten mit dem Erwartungshorizont</li>
            <li>Automatische Bepunktung und Feedback-Generierung</li>
            <li>Export als editierbares Word-Dokument (.docx)</li>
          </ul>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Der Service wird über ein Credits-System abgerechnet. Ein Credit entspricht der Korrektur einer Klausur.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>2. Nutzungsrechte</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Mit dem Kauf eines Credits-Pakets erwirbst du das Recht, die entsprechende Anzahl von Klausuren mit KorrekturPilot zu korrigieren. Die Credits haben kein Ablaufdatum und können jederzeit genutzt werden.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Wichtig:</strong> KorrekturPilot befindet sich in der Beta-Phase. Das bedeutet, dass Funktionen sich ändern können und gelegentlich Fehler auftreten können. Wir bemühen uns um eine hohe Qualität, können aber keine 100%ige Fehlerfreiheit garantieren.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>3. Registrierung und Account</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Für die Nutzung von KorrekturPilot ist eine kostenlose Registrierung erforderlich. Bei der Registrierung erhältst du Credits für eine kostenlose Test-Korrektur.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Du verpflichtest dich, bei der Registrierung wahrheitsgemäße Angaben zu machen und deine Zugangsdaten geheim zu halten. Du bist für alle Aktivitäten unter deinem Account verantwortlich.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>4. Zahlungsbedingungen</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Die Preise für Credits-Pakete sind auf der Website angegeben und verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Die Zahlung erfolgt im Voraus per Kreditkarte, PayPal oder anderen auf der Website angegebenen Zahlungsmethoden. Nach erfolgreicher Zahlung werden die Credits sofort deinem Account gutgeschrieben.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Kein Abo:</strong> KorrekturPilot funktioniert nicht als Abonnement. Du kaufst einmalig ein Credits-Paket und nutzt es, wann du willst. Es gibt keine automatische Verlängerung und keine monatlichen Gebühren.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>5. Haftung und Gewährleistung</h2>
          
          <h3 style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>5.1 Beta-Phase</h3>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Da sich KorrekturPilot in der Beta-Phase befindet, können wir keine Gewähr für eine fehlerfreie oder unterbrechungsfreie Nutzung übernehmen. Wir bemühen uns um eine hohe Qualität, können aber technische Probleme oder Fehler nicht vollständig ausschließen.
          </p>

          <h3 style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>5.2 Haftungsausschluss</h3>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wir haften nicht für Schäden, die durch die Nutzung von KorrekturPilot entstehen, es sei denn, wir haben vorsätzlich oder grob fahrlässig gehandelt. Dies gilt insbesondere für:
          </p>
          <ul style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-xl)' }}>
            <li>Fehlerhafte Korrekturvorschläge oder Bepunktungen</li>
            <li>Technische Ausfälle oder Datenverlust</li>
            <li>Unleserliche Handschriften, die nicht erkannt werden</li>
            <li>Unpassende Feedback-Texte</li>
          </ul>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Wichtig:</strong> Du behältst die pädagogische Verantwortung. KorrekturPilot ist ein Werkzeug zur Unterstützung, kein Ersatz für deine fachliche Entscheidung. Du musst alle Korrekturvorschläge prüfen und anpassen.
          </p>

          <h3 style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>5.3 Gewährleistung</h3>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Die gesetzlichen Gewährleistungsrechte bleiben unberührt. Bei Mängeln haben wir das Recht zur Nacherfüllung (Nachbesserung oder Ersatzlieferung). Die Gewährleistungsfrist beträgt 12 Monate ab Lieferung.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>6. Geld-zurück-Garantie</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wenn du mit dem Service nicht zufrieden bist, erhältst du dein Geld zurück. Kontaktiere uns einfach unter <a href="mailto:kontakt@korrekturpilot.de" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>kontakt@korrekturpilot.de</a> und wir erstatten dir den Kaufpreis innerhalb von 14 Tagen.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Diese Garantie gilt für den ersten Kauf. Bei wiederholten Käufen greift die gesetzliche Widerrufsfrist von 14 Tagen.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>7. Datenschutz</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Der Umgang mit personenbezogenen Daten ist in unserer <Link href="/datenschutz" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Datenschutzerklärung</Link> geregelt. Mit der Nutzung von KorrekturPilot erklärst du dich mit der Datenschutzerklärung einverstanden.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Beta-Hinweis:</strong> Wir empfehlen dringend, Schülernamen vor dem Upload zu anonymisieren, um maximale Datensicherheit zu gewährleisten.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>8. Urheberrecht und Nutzungsrechte</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Alle Inhalte von KorrekturPilot (Software, Texte, Grafiken) sind urheberrechtlich geschützt. Du erhältst ein einfaches, nicht übertragbares, nicht exklusives Nutzungsrecht für die Dauer der Beta-Phase.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Du darfst KorrekturPilot nicht kopieren, modifizieren, weiterverkaufen oder für kommerzielle Zwecke nutzen, die über die Korrektur eigener Klausuren hinausgehen.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>9. Kündigung</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Du kannst deinen Account jederzeit löschen, indem du uns unter <a href="mailto:kontakt@korrekturpilot.de" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>kontakt@korrekturpilot.de</a> kontaktierst.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wir behalten uns vor, Accounts zu sperren oder zu löschen, wenn du gegen diese AGB verstößt oder den Service missbräuchlich nutzt.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Nicht genutzte Credits verfallen nicht, können aber bei Kündigung nicht zurückerstattet werden, es sei denn, die Geld-zurück-Garantie greift.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>10. Änderungen der AGB</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Wir behalten uns vor, diese AGB zu ändern. Wesentliche Änderungen werden wir dir per E-Mail mitteilen. Wenn du den Änderungen nicht widersprichst, gelten sie als akzeptiert.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>11. Schlussbestimmungen</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für alle Streitigkeiten ist Köln, sofern du Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen bist.
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
        </div>

        <div className="module-card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>12. Kontakt</h2>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Bei Fragen zu diesen AGB kannst du uns kontaktieren:
          </p>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            gannaca GmbH & Co. KG<br />
            Luftschiff-Platz 26<br />
            50733 Köln<br />
            Deutschland<br />
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







