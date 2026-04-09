# Fehlerhafte PDF-Testdateien

Dieser Ordner enthält absichtlich fehlerhafte PDF-Dateien, um das neue Fehlerhandling im Korrektur-Flow manuell zu testen.

## Ordner

- `erwartungshorizont/`
  Für Schritt 2 auf `/correction`
- `klausuren/`
  Für Schritt 4 auf `/correction`

## Enthaltene Fehlerfälle

- `00_leere_datei.pdf`
  0-Byte-Datei. Sollte als leer / nicht lesbar fehlschlagen.

- `01_keine_echte_pdf.pdf`
  Datei mit `.pdf`-Endung, aber ungültigem Inhalt. Sollte als beschädigt / nicht lesbar fehlschlagen.

- `02_beschaedigte_pdf.pdf`
  Aus einer echten PDF erzeugt, aber absichtlich abgeschnitten. Sollte als beschädigt / nicht lesbar fehlschlagen.

## So testen

1. App starten und `/correction` öffnen.
2. Aus `erwartungshorizont/` eine Datei in Schritt 2 hochladen.
3. Prüfen:
   - rote Inline-Fehlermeldung unter Schritt 2
   - zusätzlicher Toast
   - kein erfolgreicher Schritt-2-Status
4. Aus `klausuren/` eine Datei in Schritt 4 hochladen.
5. Analyse starten und prüfen:
   - Fehler direkt am Dateieintrag
   - Retry-Button sichtbar
   - bei Teilfehlern kein Redirect nach `/results`

## Hinweis

Diese Dateien sind nur für manuelle Tests gedacht und bewusst unbrauchbar.
