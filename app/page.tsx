import Link from 'next/link';

const features = [
  {
    title: 'Entziffert jede Handschrift',
    description: 'Egal ob Schönschrift oder Gekritzel: KorrekturPilot erkennt den Text zuverlässig, sogar bei Tabellen oder Skizzen. Unsichere Stellen werden für dich markiert.',
  },
  {
    title: 'Dein Erwartungshorizont als Maßstab',
    description: 'Du lädst deinen Erwartungshorizont einfach als PDF hoch. Das System nutzt exakt deine Kriterien für eine faire, konsistente Bepunktung.',
  },
  {
    title: 'Korrektur im Stapel',
    description: 'Kein Einzel-Upload nötig. Scanne den ganzen Stapel am Schulkopierer oder per App, lade das PDF hoch und lass bis zu 30 Hefte gleichzeitig verarbeiten.',
  },
  {
    title: 'Editierbares Word-Dokument',
    description: 'Du erhältst kein starres Ergebnis, sondern eine Word-Datei mit Kommentaren, Punktespiegel und Feedback-Texten, die du frei anpassen kannst.',
  },
];

const steps = [
  {
    title: 'Erwartungshorizont hochladen',
    description: 'Lade deinen Erwartungshorizont als PDF hoch. Das ist die Referenz, an der sich die Bewertung orientiert.',
  },
  {
    title: 'Klausuren scannen & hochladen',
    description: 'Scanne die Schülerarbeiten (z.B. per Schulkopierer, Scan-App wie Adobe Scan oder Notizen-App) und lade sie als PDF hoch.',
  },
  {
    title: 'Analyse & Bepunktung',
    description: 'KorrekturPilot gleicht die Antworten mit deiner Lösung ab, vergibt Punkte und formuliert Feedback-Vorschläge.',
  },
  {
    title: 'Word-Export & Kontrolle',
    description: 'Du erhältst ein Word-Dokument. Jetzt hast du das letzte Wort: Prüfe die Bewertung, passe Texte an und speichere das Ergebnis.',
  },
];

const faqs = [
  {
    q: 'Für welche Fächer funktioniert das?',
    a: 'Alle textbasierten Fächer (Deutsch, Geschichte, Biologie, Politik, Fremdsprachen). Multiple-Choice ist ebenfalls möglich.',
  },
  {
    q: 'Wie läuft die kostenlose Testklausur?',
    a: 'Registriere dich kostenlos und teste 5 Klausuren unverbindlich. Erwartungshorizont + Klausuren hochladen, Ergebnisse als Word-Dokument erhalten. Für weitere Analysen dann Paket kaufen (7,90 €).',
  },
  {
    q: 'Wie steht es um Datenschutz?',
    a: 'Daten werden nur für die Korrektur genutzt. Keine öffentliche Speicherung, keine Weitergabe.',
  },
  {
    q: 'Wie lange dauert eine Korrektur?',
    a: 'Ein ganzer Klassensatz wird deutlich schneller bearbeitet als von Hand – oft in unter 60 Minuten statt eines halben Tages.',
  },
  {
    q: 'Was kostet KorrekturPilot nach dem Test?',
    a: 'Beta-Angebot: 25 Klausuren für 7,90 € (statt 29 €).',
  },
  {
    q: 'Brauche ich technische Vorkenntnisse?',
    a: 'Nein. Upload → Start → Word-Dokument laden. Keine weiteren Tools nötig.',
  },
];

export default function Home() {
  return (
    <>
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-beta-offer-badge">
              <span>
                Beta-Angebot: 25 Klausuren für 7,90 € einmalig – Jetzt sichern!
              </span>
            </div>
            <h1 className="hero-title font-extrabold">Weniger Zeit am Schreibtisch. Mehr Zeit für Unterricht.</h1>
            <p className="hero-subtitle text-blue-100">
              KorrekturPilot unterstützt dich bei der Fleißarbeit: Deine handschriftlichen Klausuren werden analysiert, mit deinem Erwartungshorizont abgeglichen und in fertiges Schülerfeedback verwandelt. Du behältst die volle Kontrolle.
            </p>
            <div className="hero-cta-group">
              <Link
                href="/auth"
                className="primary-button bg-white text-blue-900 hover:bg-blue-50"
              >
                <span>Erste Klausur kostenlos testen</span>
              </Link>
              <Link
                href="#pricing"
                className="secondary-button bg-blue-500/10 text-white border border-white/40 
               hover:bg-blue-500/20"
              >
                <span>Zum Beta-Angebot</span>
              </Link>
            </div>
            <p className="text-blue-200 opacity-80" style={{ marginTop: 'var(--spacing-md)', fontSize: '0.95rem', textAlign: 'center' }}>
              Einfach registrieren, PDF hochladen und Ergebnis prüfen. Keine Installation nötig.
            </p>
          </div>
        </div>
      </section>

      <section className="module-section" id="problem">
        <div className="container">
          <h2 className="section-title">Korrekturen sollten keine Nachtschicht sein.</h2>
          <p className="section-description">
            Einen Klassensatz fair, leserlich und ausführlich zu bewerten, kostet dich wertvolle Lebenszeit. Wir ändern den Prozess, nicht deinen Anspruch.
          </p>
          <div className="module-grid">
            <div className="module-card bg-slate-50 text-slate-600 p-10">
              <h3 className="text-slate-700">Der manuelle Weg</h3>
              <ul className="text-lg leading-relaxed" style={{ paddingLeft: 'var(--spacing-lg)' }}>
                <li>Stundenlanges Entziffern von Handschriften</li>
                <li>Ermüdung führt oft zu subjektiven Bewertungen</li>
                <li>Aufwendiges Schreiben von Feedback-Texten</li>
              </ul>
            </div>
            <div className="module-card bg-white shadow-xl border border-blue-200 p-10">
              <h3>Der Weg mit KorrekturPilot</h3>
              <ul className="text-lg leading-relaxed" style={{ color: 'var(--color-gray-700)', paddingLeft: 'var(--spacing-lg)' }}>
                <li>Liest auch unleserliche Handschriften ("Sauklaue") zuverlässig</li>
                <li>Objektiver Abgleich mit deinem Erwartungshorizont</li>
                <li>Erstellt Korrekturvorschläge und Feedback in Minuten</li>
                <li>Korrigiert einen ganzen Klassensatz (bis zu 30 Hefte) parallel</li>
              </ul>
              <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                <Link href="/auth" className="primary-button">
                  Erste Klausur kostenlos testen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="module-section" id="features">
        <div className="container">
          <h2 className="section-title">Praxistauglich und einfach: Dein digitaler Korrektur-Assistent.</h2>
          <p className="section-description">
            Alles, was du für eine schnelle und faire Bewertung brauchst – ohne technische Hürden.
          </p>
          <div className="module-grid">
            {features.map((feature) => (
              <div key={feature.title} className="module-card h-full p-8">
                <h3 className="module-card-title font-bold">{feature.title}</h3>
                <p className="module-card-description text-gray-600 text-lg leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="module-section" id="value">
        <div className="container">
          <h2 className="section-title">Wie viel Lebenszeit gewinnst du zurück?</h2>
          <p className="section-description">
            Mit KorrekturPilot erledigst du die Vorarbeit für einen ganzen Klassensatz meist in unter einer Stunde – statt eines halben Tages.
          </p>
          <div className="module-grid">
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Manuell</h3>
              <ul className="text-gray-600 text-lg leading-relaxed" style={{ paddingLeft: 'var(--spacing-lg)' }}>
                <li>Ca. 5 bis 10 Stunden pro Klassensatz</li>
                <li>Wiederkehrendes Blättern und Vergleichen</li>
                <li>Risiko von Flüchtigkeitsfehlern durch Ermüdung</li>
              </ul>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Mit KorrekturPilot</h3>
              <ul className="text-gray-600 text-lg leading-relaxed" style={{ paddingLeft: 'var(--spacing-lg)' }}>
                <li>Ein ganzer Klassensatz in ca. 60 Minuten verarbeitet</li>
                <li>Automatische Auswertung nach deinen Vorgaben</li>
                <li>Du prüfst nur noch die Vorschläge und gibst den Feinschliff</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="steps">
        <div className="container">
          <h2 className="section-title">In 4 Schritten zur fertigen Korrektur.</h2>
          <div className="process-grid">
            {steps.map((step, index) => (
              <div key={step.title} className="process-card">
                <div className="step" style={{ alignItems: 'flex-start' }}>
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <p className="step-title">{step.title}</p>
                    <p className="step-description">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="module-section" id="example">
        <div className="container">
          <h2 className="section-title">Volle Transparenz über jedes Ergebnis.</h2>
          <p className="section-description">
            Nach dem Upload erhältst du eine übersichtliche Auswertung, bevor du das Word-Dokument exportierst.
          </p>
          <div style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>
            <div style={{ 
              width: '100%', 
              maxWidth: '800px', 
              margin: '0 auto',
              padding: 'var(--spacing-2xl)',
              backgroundColor: 'var(--color-gray-50)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-md)'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                color: 'var(--color-gray-900)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                So sieht eine fertige Korrektur aus
              </h3>
              <p style={{ 
                fontSize: '1rem', 
                color: 'var(--color-gray-600)',
                marginBottom: 'var(--spacing-md)',
                maxWidth: '600px'
              }}>
                Schau dir unsere Beispielauswertung an und sieh, wie detailliert und übersichtlich die Ergebnisse präsentiert werden.
              </p>
              <Link 
                href="/beispielauswertung"
                className="primary-button"
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)'
                }}
              >
                <span>Zur Beispielauswertung</span>
                <svg 
                  style={{ width: '20px', height: '20px' }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="module-grid">
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Der schnelle Überblick</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Du siehst Fach, Klasse, Schülernamen und erreichte Punkte auf einen Blick. Ideal für eine erste Einschätzung des Leistungsniveaus.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Details auf Aufgabenebene</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Klicke in jede Aufgabe: Das System zeigt dir, was der Schüler geschrieben hat ("IST") und vergleicht es mit deiner Lösung ("SOLL").
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Export für die Rückgabe</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Alle Ergebnisse landen in einem sauber formatierten Word-Dokument. Inklusive Punktetabelle und individuell formulierten Hinweisen für die Schüler.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="module-section" id="student-feedback">
        <div className="container">
          <h2 className="section-title">Individuelles Feedback, ohne Schreibkrampf.</h2>
          <p className="section-description">
            KorrekturPilot erstellt für jede Arbeit einen Vorschlag mit Stärken, Schwächen und konkreten Tipps.
          </p>
          <div className="module-grid">
            <div className="module-card h-full p-8">
              <ul className="text-gray-600 text-lg leading-relaxed" style={{ paddingLeft: 'var(--spacing-lg)' }}>
                <li>Du musst keine Standardfloskeln mehr tippen.</li>
                <li>Du gleichst nur noch ab, ob der Tonfall passt.</li>
                <li>Das Feedback ist konstruktiv und motivierend formuliert.</li>
                <li>Du kannst jeden Satz im Word-Dokument ändern oder ergänzen.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="pricing-header">
            <h2 className="section-title">Überzeuge dich selbst – völlig risikofrei.</h2>
            <p className="section-description">Registriere dich kostenlos und teste die erste Klausur. Wenn das Ergebnis dich überzeugt, sicherst du dir den Vorzugspreis.</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card shadow-sm p-10">
              <p className="pricing-badge">Zum Kennenlernen</p>
              <div className="pricing-card-header">
                <h3>1 Klausur inkl. Word-Export</h3>
                <p className="pricing-card-price">0 €</p>
              </div>
              <p className="pricing-card-description text-lg leading-relaxed">Registriere dich kostenlos und teste gleich 5 Klausuren. So kannst du einen ganzen Klassensatz ausprobieren, bevor du dich entscheidest.</p>
              <ul className="pricing-card-features text-lg leading-relaxed">
                <li>Upload Erwartungshorizont</li>
                <li>Zuverlässige Handschriftenerkennung</li>
                <li>Korrektur als Word-Dokument</li>
                <li>Keine Zahlungsdaten nötig</li>
              </ul>
              <Link href="/auth" className="secondary-button pricing-button">
                Erste Klausur kostenlos testen
              </Link>
            </div>
            <div className="pricing-card pricing-card-highlighted shadow-2xl ring-4 ring-blue-500/30 border-2 border-blue-600 p-10">
              <p className="pricing-badge">Beta-Angebot</p>
              <div className="pricing-card-header">
                <h3>Das Klassensatz-Paket</h3>
                <p className="pricing-card-price text-6xl font-extrabold text-blue-600">7,90 € <span style={{ textDecoration: 'line-through', color: 'var(--color-gray-500)', fontSize: '0.95rem' }}>29 €</span></p>
              </div>
              <p className="pricing-card-description text-lg leading-relaxed">25 Klausuren (genug für eine volle Klasse). Das entspricht ca. 0,31 € pro Heft für Stunden gewonnener Lebenszeit.</p>
              <ul className="pricing-card-features text-lg leading-relaxed">
                <li>Ganzen Stapel auf einmal korrigieren</li>
                <li>Editierbarer Word-Export für volle Kontrolle</li>
                <li>Direkter Einfluss auf die Weiterentwicklung</li>
                <li>100% Geld-zurück-Garantie bei Unzufriedenheit</li>
              </ul>
              <Link href="/upload" className="primary-button pricing-button">
                Jetzt Klausuren hochladen (ab 7,90 €)
              </Link>
              <p className="text-lg leading-relaxed" style={{ marginTop: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--color-gray-600)', textAlign: 'center' }}>
                Du zahlst erst, wenn du weitere Klassensätze korrigieren lässt. Keine Abo-Falle.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="module-section" id="faq">
        <div className="container">
          <h2 className="section-title">Häufige Fragen</h2>
          <p className="section-description">Klare Antworten zu Technik, Datenschutz und Ablauf.</p>
          
          <div className="module-grid">
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Kann die Software auch "Sauklaue" lesen?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Ja. Das System ist auf handschriftliche Texte spezialisiert und erkennt auch unleserliche Passagen erstaunlich gut. Sollte eine Stelle wirklich nicht entzifferbar sein, wird sie im Word-Dokument markiert, damit du sie manuell prüfen kannst.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Wie bekomme ich die Klausuren in die Software?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Du benötigst die Klausuren als PDF. Das geht ganz einfach: Nutze den Scanner im Schulkopierer (Scan-to-Email/USB) oder eine kostenlose Scan-App auf dem Handy (z.B. Google Drive Scan, Notizen-App auf iOS). Fotos (JPG) funktionieren nicht direkt – bitte als PDF speichern.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Muss ich den Erwartungshorizont abtippen?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Nein. Ein Foto oder PDF deiner Lösungsvorlage oder des Erwartungshorizonts reicht völlig aus. Das System nutzt dieses Dokument als Referenz für den Abgleich.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Was passiert mit den Daten (Datenschutz)?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Deine Daten werden auf Servern in Deutschland verarbeitet. In der aktuellen Beta-Phase empfehlen wir, Namen auf den Klausuren vor dem Scan zu schwärzen oder abzudecken, um maximale Anonymität zu gewährleisten.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Habe ich das letzte Wort bei der Note?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Absolut. Du erhältst ein editierbares Word-Dokument. Du kannst Punkte anpassen, Kommentare ändern und die pädagogische Hoheit behalten. KorrekturPilot ist ein Werkzeug, kein Ersatz für deine Entscheidung.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Was, wenn mir das Ergebnis nicht hilft?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Dann greift unsere Zufriedenheitsgarantie: Schreibe uns eine kurze Mail und du erhältst deine 7,90 € sofort zurück.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="module-section" id="social-proof">
        <div className="container">
          <h2 className="section-title">Baue mit uns das ideale Werkzeug für Lehrkräfte.</h2>
          <p className="section-description">Dein Feedback fließt direkt ins nächste Update – und du sicherst dir dauerhaft günstige Konditionen.</p>
          <div className="module-grid">
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Dein Vorteil als Beta-Lehrkraft</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Du hast direkten Draht zur Entwicklung. Fehlt ein Feature? Passt das Format nicht? Als Beta-Nutzer bestimmst du mit, was als Nächstes passiert.
              </p>
            </div>
            <div className="module-card h-full p-8">
              <h3 className="font-bold">Warum jetzt?</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Sichere dir den günstigen Einstiegspreis und hilf uns, eine Lösung zu schaffen, die wirklich den Schulalltag erleichtert – von Lehrkräften für Lehrkräfte entwickelt.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="module-section" id="trust">
        <div className="container">
          <h2 className="section-title">Vertrauen &amp; Sicherheit zuerst.</h2>
          <div className="module-grid">
            <div className="module-card p-8">
              <h3 className="font-bold">Anonymisierung</h3>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--color-gray-700)' }}>
                Wir speichern so wenig Daten wie möglich. Lade am besten anonymisierte Klausuren hoch (Namen abdecken), um auf der absolut sicheren Seite zu sein.
              </p>
            </div>
            <div className="module-card p-8">
              <h3 className="font-bold">Geld-zurück-Garantie</h3>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--color-gray-700)' }}>
                100% Zufriedenheitsgarantie: Wenn die Korrektur dir keine Zeit spart, bekommst du dein Geld sofort zurück.
              </p>
            </div>
            <div className="module-card p-8">
              <h3 className="font-bold">Kontakt &amp; Support</h3>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--color-gray-700)' }}>
                Fragen oder Probleme im Produkt? Nutze unseren <Link href="/support" className="text-link">strukturierten Support-Bereich</Link> oder schreibe an <a href="mailto:kontakt@korrekturpilot.de" className="text-link">kontakt@korrekturpilot.de</a>. Wir antworten in der Regel werktags innerhalb von 24 bis 48 Stunden.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div>
              <h2>Jetzt registrieren und erste Klausur kostenlos testen.</h2>
              <p className="text-lg leading-relaxed">5 Credits werden bei der kostenlosen Registrierung sofort freigeschaltet. Teste gleich mehrere Klausuren – dein erster Klassensatz kann in weniger als einer Stunde fertig korrigiert sein.</p>
            </div>
            <div className="cta-actions">
              <Link href="/auth" className="primary-button">
                Erste Klausur kostenlos testen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
