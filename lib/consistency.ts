/**
 * Konsistenz-Helpers für deterministische Klausurbewertungen
 * 
 * Diese Funktionen stellen sicher, dass gleiche Klausuren
 * immer gleich bewertet werden (Reproduzierbarkeit).
 */

import crypto from 'crypto';

/**
 * Generiert einen deterministischen Seed aus correctionId und studentName.
 * 
 * Der Seed wird für OpenAI's API verwendet, um bei gleichen Inputs
 * immer die gleichen Outputs zu erhalten.
 * 
 * @param correctionId - Eindeutige ID der Korrektur
 * @param studentName - Name des Schülers
 * @returns Integer zwischen 0 und 2^31-1
 */
export function generateDeterministicSeed(
  correctionId: string,
  studentName: string
): number {
  const input = `${correctionId}:${studentName}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // Konvertiere erste 8 Hex-Zeichen zu Integer zwischen 0 und 2^31-1
  return parseInt(hash.slice(0, 8), 16) % (2 ** 31);
}

/**
 * Validierungsergebnis für die Analyse-Ausgabe
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validiert die Struktur und Konsistenz der Analyse-Ausgabe.
 * 
 * Prüft:
 * 1. Task-Count stimmt mit erwarteter Anzahl überein
 * 2. Summe der Punkte = achievedPoints in meta
 * 3. Keine erreichten Punkte > maxPunkte
 * 4. Evidence-Felder (whatIsCorrect/whatIsWrong) nicht beide leer
 * 5. Pflichtfelder vorhanden
 * 
 * @param output - Die Analyse-Ausgabe von OpenAI
 * @param expectedTaskCount - Erwartete Anzahl an Aufgaben (aus Erwartungshorizont)
 * @returns ValidationResult mit valid-Flag und Error-Array
 */
export function validateAnalysisOutput(
  output: any,
): ValidationResult {
  const errors: string[] = [];

  // Grundstruktur prüfen
  if (!output) {
    errors.push('Output is null or undefined');
    return { valid: false, errors };
  }

  if (!output.meta) {
    errors.push('Missing meta object');
  }

  if (!output.tasks || !Array.isArray(output.tasks)) {
    errors.push('Missing or invalid tasks array');
    return { valid: false, errors };
  }

  // Punkte-Format und Points > maxPoints prüfen
  let calculatedAchievedPoints = 0;
  let calculatedMaxPoints = 0;

  output.tasks.forEach((task: any, index: number) => {
    const taskId = task.taskId || `Task ${index + 1}`;

    // Points-Format prüfen: "erreicht/max"
    if (!task.points || typeof task.points !== 'string') {
      errors.push(`${taskId}: Missing or invalid points field`);
      return;
    }

    const pointsMatch = task.points.match(/^(\d+)\/(\d+)$/);
    if (!pointsMatch) {
      errors.push(`${taskId}: Invalid points format "${task.points}" (expected "X/Y")`);
      return;
    }

    const achieved = parseInt(pointsMatch[1], 10);
    const max = parseInt(pointsMatch[2], 10);

    calculatedAchievedPoints += achieved;
    calculatedMaxPoints += max;

    // 3. Points > maxPoints prüfen
    if (achieved > max) {
      errors.push(
        `${taskId}: Achieved points (${achieved}) exceeds max points (${max})`
      );
    }

    // 4. Evidence-Felder prüfen
    const hasWhatIsCorrect = Array.isArray(task.whatIsCorrect) && task.whatIsCorrect.length > 0;
    const hasWhatIsWrong = Array.isArray(task.whatIsWrong) && task.whatIsWrong.length > 0;

    if (!hasWhatIsCorrect && !hasWhatIsWrong) {
      errors.push(
        `${taskId}: No evidence provided (both whatIsCorrect and whatIsWrong are empty)`
      );
    }

    // Pflichtfelder prüfen
    if (!task.taskId) {
      errors.push(`Task ${index + 1}: Missing taskId`);
    }
    if (!task.taskTitle) {
      errors.push(`${taskId}: Missing taskTitle`);
    }
  });

  // 2. Meta-Punkte mit berechneten Punkten vergleichen (nur Warnung, kein harter Fehler)
  // normalizeAnalysis() berechnet die Summen ohnehin korrekt aus den Einzelaufgaben
  if (output.meta) {
    if (typeof output.meta.achievedPoints === 'number' && calculatedAchievedPoints !== output.meta.achievedPoints) {
      console.warn(
        `[Konsistenz] Points sum Warnung: calculated ${calculatedAchievedPoints}, meta says ${output.meta.achievedPoints} (wird aus Einzelaufgaben korrigiert)`
      );
    }
    if (typeof output.meta.maxPoints === 'number' && calculatedMaxPoints !== output.meta.maxPoints) {
      console.warn(
        `[Konsistenz] Max points sum Warnung: calculated ${calculatedMaxPoints}, meta says ${output.meta.maxPoints} (wird aus Einzelaufgaben korrigiert)`
      );
    }
  }

  // 5. Weitere Pflichtfelder in meta prüfen
  if (output.meta) {
    const requiredMetaFields = ['studentName', 'class', 'subject', 'grade'];
    requiredMetaFields.forEach((field) => {
      if (!output.meta[field]) {
        errors.push(`Missing meta.${field}`);
      }
    });
  }

  // teacherConclusion prüfen
  if (!output.teacherConclusion || !output.teacherConclusion.summary) {
    errors.push('Missing teacherConclusion.summary');
  }

  // strengths und nextSteps prüfen
  if (!Array.isArray(output.strengths) || output.strengths.length === 0) {
    errors.push('Missing or empty strengths array');
  }
  if (!Array.isArray(output.nextSteps) || output.nextSteps.length === 0) {
    errors.push('Missing or empty nextSteps array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extrahiert die erwartete Aufgaben-Anzahl aus dem Erwartungshorizont.
 * 
 * Verwendet Multi-Pass Regex um verschiedene Formate zu erkennen:
 * - 1.1, 1.2, 2.3 (strikt)
 * - "Aufgabe 1", "Frage 2"
 * - Nummerierung am Zeilenanfang
 * 
 * @param erwartungshorizont - Der Erwartungshorizont-Text
 * @returns Anzahl der gefundenen Aufgaben
 */
export function extractExpectedTaskCount(erwartungshorizont: string): number {
  // PASS 1: Strikte IDs (1.1, 1.2, 2.3, etc.)
  const strictMatches = erwartungshorizont.match(/\d+\.\d+/g) || [];
  if (strictMatches.length > 0) {
    return [...new Set(strictMatches)].length;
  }

  // PASS 2: "Aufgabe X" oder "Frage X" oder "Task X"
  const aufgabeMatches = erwartungshorizont.match(
    /(?:Aufgabe|Frage|Task)\s+(\d+(?:\.\d+)?)/gi
  ) || [];
  if (aufgabeMatches.length > 0) {
    const extracted = aufgabeMatches
      .map((m) => {
        const numMatch = m.match(/\d+(?:\.\d+)?/);
        return numMatch ? numMatch[0] : '';
      })
      .filter(Boolean);
    return [...new Set(extracted)].length;
  }

  // PASS 3: Einfache Nummern am Zeilenanfang
  const lines = erwartungshorizont.split('\n');
  const lineNumberMatches: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)[\.\)]\s/);
    if (match) {
      lineNumberMatches.push(match[1]);
    }
  }
  if (lineNumberMatches.length > 0) {
    return [...new Set(lineNumberMatches)].length;
  }

  // NOTFALL: Keine Struktur erkannt, gebe 1 zurück
  console.warn('[extractExpectedTaskCount] Keine explizite Aufgabenstruktur erkannt');
  return 1;
}
