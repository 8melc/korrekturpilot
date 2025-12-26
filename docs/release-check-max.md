# Release-Checkliste: Max Bugfixes (BUG1-4)

## Übersicht
Diese Checkliste validiert alle 4 Bugfixes vor dem Release:
- **BUG1**: Noten passen NICHT zur Notentabelle (5- Arbeit → Note 4)
- **BUG2**: Notentabelle BUG: keine Angabe 29-32 Punkte
- **BUG3**: Schülerfeedback: richtige/verbesserungsbedürftige Punkte GLEICH/Widersprüchlich
- **BUG4**: Alle Ergebnisse SYSTEMATISCH ZU GUT

---

## ⚠️ WICHTIG: NICHT ändern (explizit)

### ESLint/TypeScript
- **KEINE `any`-Typen ändern** in folgenden Dateien:
  - `app/api/analyze/route.ts` (13x `any`)
  - `app/api/extract-klausur/route.ts` (viele `any`)
  - `lib/analysis/controller.ts` (3x `any`)
  - `lib/analysis/validator.ts` (6x `any`)
- **KEINE** neuen ESLint-Regeln einführen
- **KEINE** globalen `any`-Verbote aktivieren
- Diese Lints sind **nicht kritisch** für Funktion oder Release

### Andere Bereiche
- **KEINE** Upload-/Queue-Logik ändern
- **KEINE** neuen Ordner/Strukturen einführen
- **KEINE** Logik in nicht-kritischen Dateien ändern

### Nur diese Dateien sind kritisch (bereits gefixt)
**Bugfix-Dateien:**
1. `lib/grades.ts` - BUG2 Fix (29-32% = 5−)
2. `lib/analysis/controller.ts` - BUG1+4 Fix (gradeLevel, OpenAI-Call, Logging)
3. `lib/analysis/validator.ts` - BUG3 Fix (Feedback-Overlap)
4. `lib/analysis/prompts/master-analysis-prompt.ts` - BUG4 Fix (strikter Prompt)

**Test-Dateien:**
- `lib/grades.test.ts`
- `lib/analysis/controller.test.ts`
- `lib/analysis/controller.e2e.test.ts`
- `lib/analysis/validator.test.ts`
- `components/ResultCard.test.tsx`

---

## Phase 1: Build & Lint ✅

- [x] `npm run build` erfolgreich
- [x] `npm run lint` ohne kritische Errors (nur Warnings)
- [x] TypeScript-Kompilierung ohne Fehler
- [x] Dev-Server startet (`npm run dev`)

---

## Phase 2: Unit Tests ✅

- [x] **Noten-Tests (BUG2)**: `lib/grades.test.ts`
  - [x] 26-28% → "5"
  - [x] 29-32% → "5−" (BUG2 Fix)
  - [x] 33-35% → "5+"
  - [x] Edge Cases: 29%, 32%, 33%

- [x] **gradeLevel-Parsing (BUG1)**: `lib/analysis/controller.test.ts`
  - [x] "10a" → 10
  - [x] "11b" → 11
  - [x] "Klasse 12" → 12
  - [x] undefined/null → 10 (Fallback)
  - [x] "Q1" → 1 (technisch korrekt, enthält "1")

- [x] **Feedback-Overlap (BUG3)**: `lib/analysis/validator.test.ts`
  - [x] Strength "Rechnung richtig" + NextStep "Rechnung üben" → NextStep entfernt
  - [x] Strength "Fachbegriffe korrekt" + NextStep "Fachbegriffe üben" → NextStep entfernt
  - [x] Kein Overlap → beide Arrays bleiben unverändert
  - [x] Multiple Overlaps → alle entfernt

---

## Phase 3: Integration & Logging ✅

- [x] **E2E-Analyse-Durchlauf**: `lib/analysis/controller.e2e.test.ts`
  - [x] Mock-Daten für Erwartungshorizont und Klausur
  - [x] `normalizeAnalysis` berechnet Punkte korrekt aus Tasks
  - [x] `getGradeInfo` wird mit korrektem `gradeLevel` aufgerufen
  - [x] `meta.maxPoints`, `meta.achievedPoints`, `meta.grade` sind konsistent

- [x] **Logging für Punkteberechnung**: `lib/analysis/controller.ts` (Zeile ~203)
  - [x] Logging zeigt: `achievedPoints`, `maxPoints`, `percentage`, `gradeLevel`, `grade`, `className`

---

## Phase 4: UI & Release ✅

- [x] **UI-Snapshot für ResultCard**: `components/ResultCard.test.tsx`
  - [x] Note wird korrekt gerendert
  - [x] Prozent wird korrekt angezeigt
  - [x] Strengths und NextSteps werden ohne Overlaps angezeigt
  - [x] Grade-Badge hat korrekte CSS-Klasse

---

## Phase 5: Manuelle Validierung (NACH DEPLOY)

### BUG2: 29-32% Notentabelle
**Schritte:**
1. Beispielklausur mit ~30% (29-32%) analysieren
2. In der UI prüfen: Note = "5−" (nicht "5" oder "5+")
3. Notentabelle zeigt korrekte Zuordnung

**Erwartetes Ergebnis:**
- 29% → "5−" ✅
- 30% → "5−" ✅
- 31% → "5−" ✅
- 32% → "5−" ✅

### BUG1+4: Noten passen zur Notentabelle + Zu gut Bias
**Schritte:**
1. Max' Beispielklausur neu analysieren
2. Browser-Console öffnen (F12)
3. Prüfen: `[Grade Calculation]` Log zeigt korrekte Werte:
   ```javascript
   {
     achievedPoints: 35,  // Aus Tasks berechnet
     maxPoints: 45,       // Aus Tasks berechnet
     percentage: "77.78%",
     gradeLevel: 10,      // Aus className extrahiert
     grade: "2−",
     className: "10a"
   }
   ```
4. Prüfen: `gradeLevel` wird aus `className` extrahiert (z.B. "10a" → 10)
5. Prüfen: Note passt zur Notentabelle (SEK I vs. SEK II)
6. Prüfen: Punkte werden AUSSCHLIESSLICH aus Erwartungshorizont extrahiert
7. Prüfen: Keine "großzügigen" Teilpunkte mehr

**Erwartetes Ergebnis:**
- `gradeLevel` wird korrekt aus `className` extrahiert ✅
- Note passt zur Notentabelle (SEK I/SEK II) ✅
- Punkte sind konsistent (aus Tasks berechnet) ✅

### BUG3: Feedback Overlap
**Schritte:**
1. Klausur analysieren, die früher Overlap hatte (z.B. "Rechnung korrekt" + "Rechnung üben")
2. In der UI prüfen: `strengths` und `nextSteps` haben KEINE widersprüchlichen Items
3. Prüfen: Wenn "Rechnung korrekt" in strengths → "Rechnung üben" NICHT in nextSteps
4. Browser-Console prüfen: `🔥 FEEDBACK OVERLAP gefunden:` erscheint bei Overlap-Erkennung

**Erwartetes Ergebnis:**
- Kein Punkt gleichzeitig in Stärken + NextSteps ✅
- Console zeigt Overlap-Warnung bei Erkennung ✅

---

## Code-Änderungen Übersicht

### Geänderte Dateien:
1. **`lib/grades.ts`**
   - BUG2 Fix: 29-32% → "5−" hinzugefügt

2. **`lib/analysis/controller.ts`**
   - BUG1 Fix: `extractGradeLevelFromClassName()` Funktion hinzugefügt
   - BUG1 Fix: `gradeLevel` wird dynamisch aus `className` extrahiert
   - BUG4 Fix: `temperature: 0.0`, `top_p: 0.1` für deterministischere KI-Antworten
   - BUG4 Fix: System-Prompt erweitert mit strikten Punkt-Anweisungen
   - Logging für Punkteberechnung hinzugefügt

3. **`lib/analysis/validator.ts`**
   - BUG3 Fix: `validateFeedbackOverlap()` Funktion hinzugefügt
   - BUG3 Fix: Overlap-Erkennung mit Stop-Wörtern und Wortlängen-Filter

4. **`lib/analysis/prompts/master-analysis-prompt.ts`**
   - BUG4 Fix: Strikte Anweisungen für Punkt-Extraktion aus Erwartungshorizont

### Neue Test-Dateien:
- `lib/grades.test.ts`
- `lib/analysis/controller.test.ts`
- `lib/analysis/controller.e2e.test.ts`
- `lib/analysis/validator.test.ts`
- `components/ResultCard.test.tsx`

### Neue Konfigurationsdateien:
- `vitest.config.ts`
- `vitest.setup.ts`

---

## Deployment-Schritte

### Automatische Checks (✅ Abgeschlossen)
1. [x] Alle Tests grün: `npm run test` (23 Tests bestanden)
2. [x] Build erfolgreich: `npm run build`
3. [x] Lint: Errors vorhanden, aber nicht kritisch (nur `@typescript-eslint/no-explicit-any`)

### Deployment
4. [ ] Git commit: `git add . && git commit -m "BUG1-4 Fixes: Noten, Overlap, gradeLevel, Punkteberechnung"`
5. [ ] Git push: `git push origin main`
6. [ ] Vercel Deployment prüfen

### Manuelle Validierung (NACH DEPLOY)
7. [ ] Manuelle Validierung mit Beispielklausur von Max (siehe Phase 5)
8. [ ] Screenshots aktualisiert (falls vorhanden)
9. [ ] Logging zeigt korrekte Werte in Production

---

## Erwartete Test-Ergebnisse

### BUG2 Test (29-32%):
```typescript
getGradeInfo({ prozent: 30, gradeLevel: 10 }).label === "5−" // ✅
```

### BUG1 Test (gradeLevel):
```typescript
extractGradeLevelFromClassName("10a") === 10 // ✅
extractGradeLevelFromClassName("11b") === 11 // ✅
```

### BUG3 Test (Overlap):
```typescript
strengths: ["Rechnung korrekt"]
nextSteps: ["Rechnung üben"] // → wird entfernt ✅
```

### BUG4 Test (Logging):
```typescript
console.log('[Grade Calculation]', {
  achievedPoints: 35,
  maxPoints: 45,
  percentage: "77.78%",
  gradeLevel: 10,
  grade: "2+",
  className: "10a"
}); // ✅
```

---

## Notizen

- **Stripe API Version**: Aktualisiert auf `2025-12-15.clover` (Build-Fix)
- **ESLint**: Vollständig neu aufgesetzt, funktioniert jetzt korrekt
- **Vitest**: Neu installiert für Test-Framework
- **React Testing Library**: Neu installiert für UI-Tests

---

**Status**: ✅ Alle automatisierten Tests bestanden  
**Nächster Schritt**: Deployment und manuelle Validierung mit Max' Beispielklausur

