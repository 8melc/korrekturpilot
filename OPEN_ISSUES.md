# Offene Punkte KorrekturPilot

**Stand:** 10. März 2026
**Status:** App ist live, wird von Usern genutzt
**Nächste Arbeitsphase:** Ab KW 12 (Mitte März 2026)

---

## A) User-Bugs (gemeldet)

### A1. Schritte 3+4 ausgegraut / nicht klickbar
**Gemeldet von:** Amata Steinlechner (07.03.2026)
**Problem:** Userin kann Erwartungshorizont hochladen (Schritt 2), aber Schritt 3 (Datenschutz) und Schritt 4 (Klausuren hochladen) bleiben ausgegraut.
**Ursache (Vermutung):** Die Steps werden erst freigeschaltet wenn:
- Alle Kursdaten ausgefüllt sind (Fach, Klasse, Stufe, Schuljahr) UND
- Der Erwartungshorizont-Text erfolgreich extrahiert wurde

Wahrscheinlich hat entweder die PDF-Textextraktion still versagt (kein Fehler angezeigt, aber `expectationText` bleibt `null`) oder die Kursdaten waren nicht vollständig.
**Handlungsbedarf:**
- [ ] Bug reproduzieren
- [ ] Besseres Feedback wenn Textextraktion fehlschlägt
- [ ] Prüfen ob Fehlermeldung bei unvollständigen Kursdaten deutlich genug ist
- [ ] Amata antworten

### A2. Neuer Testuser: Björn (Bio LK, 12. Klasse, 17 Schüler)
**Gemeldet von:** Christopher via Jorge (07.03.2026)
**Situation:** Björn will KorrekturPilot testen. Hat nächste Woche eine Bio LK Klausur mit 17 Schülern. Fragt ob er sich einfach über die Homepage anmeldet oder ob es einen Testaccount gibt.
**Handlungsbedarf:**
- [ ] Björn kontaktieren (Email über Jorge/Christopher besorgen)
- [ ] Klären: Bekommt er Gratis-Credits oder normalen Account?
- [ ] Wichtig: Sein Use Case (Bio LK, 17 Klausuren) ist ein guter Stresstest
- [ ] Persönlich begleiten wie Christopher vorschlägt (lernen wo es hakt)

### A3. Datenschutzerklärung verbessern
**Gemeldet von:** Kommentar über Jorge (07.03.2026)
**Problem:** Jemand hat die Datenschutzerklärung kommentiert - muss verbessert werden.
**Handlungsbedarf:**
- [ ] Aktuelle Datenschutzerklärung prüfen
- [ ] Feedback genauer klären (was genau wurde bemängelt?)
- [ ] Text überarbeiten

### A4. Response-Zeit auf User-Anfragen / Support-SLA
**Von:** Christopher (09.03.2026)
**Frage:** Welchen technischen Support-Anspruch stellen wir? Wie schnell melden wir uns zurück? Christopher will daraus eine feste Regel machen.
**Handlungsbedarf:**
- [ ] SLA definieren (z.B. "Erstantwort innerhalb 24h an Werktagen")
- [ ] Support-Prozess klären: Wer antwortet? Über welchen Kanal?
- [ ] Ggf. automatische Eingangsbestätigung per Mail einrichten

### A5. Direkter Kontakt mit Nutzern
**Von:** Christopher (10.03.2026)
**Wunsch:** Christopher sieht dringende Notwendigkeit, mit Nutzern direkt und persönlich in Kontakt zu treten. "So erleben sie eine wirklich interessierte Seite von KP und wir können lernen, wo es hakt."
**Handlungsbedarf:**
- [ ] Prozess definieren: Wie kontaktieren wir User bei Problemen?
- [ ] Bei Amata und Björn direkt umsetzen als Pilot

---

## B) Kritische technische Bugs

### B1. Memory Leak in useAnalysisQueue
**Datei:** `hooks/useAnalysisQueue.ts`
**Problem:** `setTimeout`-Calls ohne Cleanup. Timer laufen weiter wenn User Tab schließt, was zu API-Calls im Hintergrund führt.
**Fix:** Timeout-IDs in Ref speichern, im useEffect Cleanup abräumen.
**Priorität:** KRITISCH

### B2. Credit-Verlust bei Tab-Schließung
**Datei:** `app/api/analyze/route.ts`
**Problem:** Wenn User Tab während laufender Analyse schließt, wird Credit serverseitig abgezogen, aber User sieht das Ergebnis nie.
**Fix-Optionen:**
1. Ergebnis serverseitig in DB speichern BEVOR Credit abgezogen wird (dann sieht User es beim nächsten Login)
2. AbortController für Fetch-Calls
3. Mindestens: Klare Warnung anzeigen
**Priorität:** KRITISCH

---

## C) Wichtige Verbesserungen

### C1. Erwartungshorizont-Validierung im Frontend
**Datei:** `app/correction/page.tsx`
**Problem:** API verlangt min. 10 Zeichen, Frontend prüft das nicht. User bekommt unklaren Fehler.
**Fix:** Frontend-Validierung + Fehlermeldung hinzufügen.

### C2. Race Condition: Doppelklick auf "Analyse starten"
**Datei:** `app/correction/page.tsx`
**Problem:** Button ist nicht sofort disabled nach Klick. Mehrfach-Klick = mehrfach Credits.
**Fix:** Button sofort disablen + Early Return Guard.

### C3. Fehlermeldungen bei Netzwerkproblemen
**Datei:** `hooks/useAnalysisQueue.ts`
**Problem:** Bei Netzwerkausfall sieht User nur "Analyse fehlgeschlagen" statt hilfreicher Meldung.
**Fix:** Netzwerkfehler erkennen und spezifische Meldung zeigen.

---

## D) Roadmap Phase 2 (Features)

| # | Feature | Aufwand | Priorität |
|---|---------|---------|-----------|
| D1 | Async Processing (Analyse läuft weiter auch bei Tab-Schließung) | 5-7 Tage | Hoch |
| D2 | Bulk-Upload >10 Dateien mit Queue | 3-4 Tage | Hoch |
| D3 | Bessere Progress-Anzeige während Analyse | 1-2 Tage | Mittel |
| D4 | Flexible Kursdaten (Combobox statt Dropdown) | 2-3 Tage | Mittel |
| D5 | Bild-Upload (JPG/PNG) statt nur PDF | 2-3 Tage | Mittel |

---

## F) Business / Organisatorisches

### F1. Firmenname / Branding
**Von:** Maximilian Gröning (20.01.2026)
**Vorschlag:** "AI-DUCATION INTELLIGENCE GmbH" mit Logo-Entwurf
**Handlungsbedarf:**
- [ ] Entscheidung: Bleibt es bei "KorrekturPilot" oder wird umfirmiert?
- [ ] Falls neuer Name: Domain, Branding, App-Titel anpassen

### F2. Vergütung / Finanzen
- [ ] Vergütungsmodell klären (Stundenbasis? Pauschal? Beteiligung?)
- [ ] Rechnungsstellung / Vertrag

---

## E) Security & Compliance (aus Notion-Board)

### Sprint 1 - MUST HAVE
| # | Feature | Aufwand (h) | Priorität |
|---|---------|-------------|-----------|
| E1 | Security Headers (HSTS, CSP, XSS Protection, X-Frame-Options etc.) in next.config.js | 3 | Must have |
| E2 | Dependency-Audit (npm audit, Schwachstellen beheben, regelmäßige Updates) | 2 | Must have |

### Sprint 2 - SHOULD HAVE
| # | Feature | Aufwand (h) | Priorität |
|---|---------|-------------|-----------|
| E3 | Input-Validierung PDF-Uploads serverseitig (Dateigröße, MIME-Type, Upload-Limit pro User) | 4 | Should have |
| E4 | Rate Limiting (Login Brute-Force-Schutz, API-Anfragen, PDF-Upload DoS-Schutz) | 5 | Should have |
| E5 | CSRF-Protection prüfen/aktivieren (Tokens bei Uploads, Zahlungen) | 4 | Should have |
| E6 | Impressum/Datenschutz vollständig prüfen (Links vorhanden, Inhalte checken) | 2 | Should have |

### Sprint 3 - COULD HAVE / NICE TO HAVE
| # | Feature | Aufwand (h) | Priorität |
|---|---------|-------------|-----------|
| E7 | Cookie-Consent implementieren (DSGVO-konformer Banner) | 3 | Could have |
| E8 | Malware-Scanning für Uploads | 6 | Could have |
| E9 | AVV-Vorlage für Schulen (Auftragsverarbeitungsvertrag) | 8 | Could have |
| E10 | Error-Messages optimieren (Info-Leakage vermeiden) | 2 | Nice to have |
| E11 | Backup-Strategie dokumentieren | 4 | Nice to have |
| E12 | Incident-Response-Plan dokumentieren | 6 | Nice to have |
| E13 | Penetration Test (OWASP ZAP o.ä.) | 12 | Nice to have |

---

## G) Deployment / Infrastruktur

- [ ] CI/CD Pipeline einrichten (aktuell keine GitHub Actions)
- [ ] Auth-Schutz für Production aktivieren (aktuell Dev-Modus)
- [ ] Support-Email / Kontaktformular mit Auto-Reply

---

## Vorgeschlagene Reihenfolge

**Sofort (diese Woche / im Check-in klären):**
1. A1 - Amata-Bug reproduzieren und fixen + ihr antworten
2. A2 - Björn onboarden (Credits? Testaccount?) + persönlich begleiten
3. A4 - Support-SLA mit Christopher definieren
4. A5 - Prozess für direkten User-Kontakt abstimmen

**Nächste Woche (ab KW 12):**
5. B1 - Memory Leak fixen
6. B2 - Credit-Verlust Problem lösen
7. E1+E2 - Security Headers + Dependency Audit (Must haves)
8. C1+C2 - Frontend-Validierung + Doppelklick-Schutz

**Sprint 2 (KW 13-14):**
9. E3-E6 - Security Should-haves (Input-Validierung, Rate Limiting, CSRF, Datenschutz)
10. A3 - Datenschutzerklärung überarbeiten

**Danach:**
11. Phase 2 Features (D1-D5) nach Priorisierung
12. Security Nice-to-haves (E7-E13)
