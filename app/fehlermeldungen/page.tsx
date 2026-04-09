import {
  DEFAULT_ACCESS_MESSAGE,
  DEFAULT_AUTH_MESSAGE,
  DEFAULT_CREDITS_MESSAGE,
  DEFAULT_FILE_MESSAGE,
  DEFAULT_NETWORK_MESSAGE,
  DEFAULT_OVERLOADED_MESSAGE,
  DEFAULT_SERVER_MESSAGE,
  DEFAULT_TIMEOUT_MESSAGE,
  DEFAULT_UPLOAD_MESSAGE,
} from '@/lib/user-facing-errors'

type ErrorEntry = {
  title: string
  location: string
  trigger: string
  retry: string
  message: string
}

type ErrorSection = {
  title: string
  description: string
  entries: ErrorEntry[]
}

const sections: ErrorSection[] = [
  {
    title: 'Schritt 2: Erwartungshorizont',
    description:
      'Diese Meldungen erscheinen direkt unter dem Upload für den Erwartungshorizont und zusätzlich als Toast.',
    entries: [
      {
        title: 'Erwartungshorizont konnte nicht verarbeitet werden',
        location: 'Inline unter Schritt 2 + Toast',
        trigger:
          'Die PDF lässt sich zwar hochladen, aber die Extraktion schlägt fehl oder liefert inhaltlich keinen brauchbaren Text.',
        retry: 'Dieselbe oder eine andere PDF erneut hochladen.',
        message:
          'Der Erwartungshorizont konnte nicht verarbeitet werden. Bitte lade eine andere PDF hoch.',
      },
      {
        title: 'Datei leer / beschädigt / nicht lesbar',
        location: 'Inline unter Schritt 2 + Toast',
        trigger:
          'Die API liefert zwar erfolgreich zurück, aber ohne lesbaren Text oder mit fachlichem Fehler.',
        retry: 'Eine besser lesbare PDF erneut hochladen.',
        message: DEFAULT_FILE_MESSAGE,
      },
      {
        title: 'Schritt 2 blockiert den Flow',
        location: 'Seitenweite Fehlerbox / Blocker-Hinweis',
        trigger:
          'Es wurde versucht weiterzumachen, obwohl der Erwartungshorizont noch fehlerhaft oder nicht erfolgreich verarbeitet ist.',
        retry: 'Zuerst Schritt 2 erfolgreich abschließen.',
        message:
          'Der Upload- oder Extraktionsfehler liegt beim Erwartungshorizont in Schritt 2. Die Datenschutz-Checkbox oder der Start-Button blockieren nicht das Weiterkommen.',
      },
    ],
  },
  {
    title: 'Datei-Upload und Extraktion',
    description:
      'Diese Meldungen erscheinen direkt an einzelnen Schülerdateien in der Fortschrittsliste. Dort gibt es auch den Button „Erneut versuchen“.',
    entries: [
      {
        title: 'Upload-Vorbereitung fehlgeschlagen',
        location: 'Dateieintrag + Toast',
        trigger:
          'Die signierte Upload-URL konnte nicht erstellt werden, z. B. wegen Auth- oder Backend-Fehlern.',
        retry: 'An derselben Datei „Erneut versuchen“.',
        message:
          'Der Upload der Datei konnte nicht vorbereitet werden. Bitte versuche es erneut.',
      },
      {
        title: 'Upload fehlgeschlagen',
        location: 'Dateieintrag + Toast',
        trigger:
          'Der eigentliche Datei-Upload schlägt beim PUT-Request fehl.',
        retry: 'An derselben Datei „Erneut versuchen“.',
        message: DEFAULT_UPLOAD_MESSAGE,
      },
      {
        title: 'PDF konnte nicht gelesen werden',
        location: 'Dateieintrag + Toast',
        trigger:
          'Die Klausur-PDF lässt sich zwar hochladen, aber nicht extrahieren oder liefert keinen lesbaren Inhalt.',
        retry: 'Bessere PDF hochladen oder dieselbe Datei erneut versuchen.',
        message:
          'Die PDF konnte nicht gelesen werden. Bitte versuche es mit einer anderen Datei erneut.',
      },
      {
        title: 'Allgemeiner Datei-Fehler',
        location: 'Dateieintrag + Toast',
        trigger:
          'Ein anderer Fehler tritt während Upload oder Extraktion auf und wird für Nutzer vereinheitlicht.',
        retry: 'An derselben Datei „Erneut versuchen“.',
        message:
          'Die Datei konnte nicht verarbeitet werden. Bitte versuche es erneut.',
      },
    ],
  },
  {
    title: 'Analyse',
    description:
      'Diese Meldungen erscheinen direkt an betroffenen Dateien während oder nach der Analyse und zusätzlich als Toast.',
    entries: [
      {
        title: 'Analyse allgemein fehlgeschlagen',
        location: 'Dateieintrag + Toast',
        trigger:
          'Ein Analyse-Request scheitert ohne speziellere Zuordnung.',
        retry: 'An der betroffenen Datei „Erneut versuchen“.',
        message:
          'Die Analyse konnte nicht durchgeführt werden. Bitte versuche es erneut.',
      },
      {
        title: 'Keine Credits',
        location: 'Dateieintrag + Toast',
        trigger: 'Der Analyse-Endpunkt antwortet mit Status 402.',
        retry: 'Erst Credits aufladen, danach Retry.',
        message: DEFAULT_CREDITS_MESSAGE,
      },
      {
        title: 'Sitzung abgelaufen',
        location: 'Dateieintrag + Toast',
        trigger: 'Der Nutzer ist nicht mehr gültig eingeloggt.',
        retry: 'Neu anmelden und dann Retry ausführen.',
        message: DEFAULT_AUTH_MESSAGE,
      },
      {
        title: 'OpenAI überlastet',
        location: 'Dateieintrag + Toast',
        trigger: 'Der Analyse-Endpunkt liefert 429 oder einen Rate-Limit-Fehler.',
        retry: 'Ein paar Minuten warten und dann Retry.',
        message: DEFAULT_OVERLOADED_MESSAGE,
      },
      {
        title: 'Timeout',
        location: 'Dateieintrag + Toast',
        trigger: 'Die Analyse oder Extraktion dauert zu lange.',
        retry: 'Noch einmal versuchen, idealerweise mit kleinerer oder besser lesbarer Datei.',
        message: DEFAULT_TIMEOUT_MESSAGE,
      },
      {
        title: 'Netzwerkfehler',
        location: 'Dateieintrag + Toast',
        trigger: 'Fetch-/Verbindungsfehler im Browser oder beim Upload.',
        retry: 'Internetverbindung prüfen und Retry.',
        message: DEFAULT_NETWORK_MESSAGE,
      },
    ],
  },
  {
    title: 'Seitenweite Sammelmeldungen',
    description:
      'Diese Hinweise erscheinen oberhalb von „Analyse starten“, wenn der Nutzer sonst im Unklaren wäre, warum der Flow blockiert oder nicht weiterleitet.',
    entries: [
      {
        title: 'Fehlerhafte Dateien statt Redirect',
        location: 'Rote Sammelbox über dem Startbereich',
        trigger:
          'Mindestens eine Datei ist fehlgeschlagen; deshalb bleibt die Seite bewusst auf `/correction`.',
        retry: 'Direkt an den fehlerhaften Dateien „Erneut versuchen“.',
        message:
          'Mindestens eine Datei konnte nicht vollständig verarbeitet werden. Die Fehlermeldungen stehen direkt an den betroffenen Dateien. Bitte versuche diese Dateien erneut; die Datenschutz-Checkbox oder der Start-Button sind nicht der Blocker.',
      },
      {
        title: 'Start-Button allein reicht nicht',
        location: 'Rote Sammelbox über dem Startbereich',
        trigger:
          'Es gibt noch fehlgeschlagene Dateien und der Nutzer klickt erneut auf „Analyse starten“.',
        retry: 'Retry direkt an der jeweiligen Datei nutzen.',
        message:
          'Mindestens eine Datei ist fehlgeschlagen. Bitte starte den Retry direkt an der betroffenen Datei; der Start-Button allein behebt diese Fehler nicht.',
      },
      {
        title: 'Teilweiser Batch-Erfolg',
        location: 'Blaue Statusbox im Startbereich',
        trigger:
          'Ein Batch endet gemischt mit erfolgreichen und fehlgeschlagenen Dateien.',
        retry: 'Fehlerhafte Dateien erneut versuchen.',
        message:
          '3 Analysen erfolgreich, 1 fehlgeschlagen. Bitte fehlerhafte Dateien erneut versuchen.',
      },
      {
        title: 'Kompletter Erfolg',
        location: 'Blaue Statusbox im Startbereich',
        trigger:
          'Alle Dateien wurden erfolgreich verarbeitet; danach folgt der Redirect zu `/results`.',
        retry: 'Kein Retry nötig.',
        message:
          'Analyse abgeschlossen. Du wirst jetzt zu den Ergebnissen weitergeleitet.',
      },
    ],
  },
  {
    title: 'Zentrale Standardmeldungen',
    description:
      'Diese Texte kommen aus dem zentralen Fehler-Normalizer und werden in mehreren Schritten wiederverwendet.',
    entries: [
      {
        title: 'Zugriff verweigert',
        location: 'Datei- oder API-bezogen',
        trigger: '403 oder fremde Datei / fehlende Berechtigung.',
        retry: 'Erneut anmelden oder nur eigene Dateien nutzen.',
        message: DEFAULT_ACCESS_MESSAGE,
      },
      {
        title: 'Unerwarteter Serverfehler',
        location: 'Fallback',
        trigger: 'Wenn kein besserer nutzerverständlicher Text verfügbar ist.',
        retry: 'Erneut versuchen.',
        message: DEFAULT_SERVER_MESSAGE,
      },
    ],
  },
]

export default function ErrorMessagesPage() {
  return (
    <section className="module-section">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
        <div>
          <h1 className="section-title">Fehlermeldungen im Korrektur-Flow</h1>
          <p className="section-description">
            Diese Seite zeigt die aktuell vorgesehenen Nutzer-Fehlermeldungen für Upload, Extraktion, Analyse und Blocker im Flow.
          </p>
          <div
            style={{
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              background: 'var(--color-info-light)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-gray-800)',
            }}
          >
            Route: <code>/fehlermeldungen</code>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="module-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>{section.title}</h2>
              <p style={{ color: 'var(--color-gray-700)', margin: 0 }}>{section.description}</p>
            </div>

            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              {section.entries.map((entry) => (
                <article
                  key={`${section.title}-${entry.title}`}
                  style={{
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-lg)',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>{entry.title}</h3>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.25rem 0.5rem',
                        background: 'var(--color-gray-100)',
                        borderRadius: '999px',
                        color: 'var(--color-gray-700)',
                      }}
                    >
                      {entry.location}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-gray-700)' }}>
                    <strong>Auslöser:</strong> {entry.trigger}
                  </p>
                  <p style={{ margin: 0, color: 'var(--color-gray-700)' }}>
                    <strong>Was tun:</strong> {entry.retry}
                  </p>
                  <div
                    style={{
                      marginTop: 'var(--spacing-xs)',
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-error-light)',
                      border: '1px solid var(--color-error)',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--color-error-dark)',
                      lineHeight: '1.6',
                    }}
                  >
                    {entry.message}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
