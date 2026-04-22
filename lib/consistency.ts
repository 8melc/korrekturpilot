/**
 * Konsistenz-Helpers für deterministische Klausurbewertungen
 *
 * Diese Funktionen stellen sicher, dass gleiche Klausuren
 * immer gleich bewertet werden (Reproduzierbarkeit).
 */

import crypto from 'crypto';

export const CONSISTENCY_VERSION = '2026-04-09-consistency-v1';
export const ANALYSIS_MODEL_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.0,
  topP: 1,
  ocrProvider: 'google-generative-ai',
  ocrModel: 'gemini-2.5-flash',
} as const;

export interface AnalysisFingerprintInput {
  klausurText: string;
  erwartungshorizont: string;
  subject?: string;
  studentName?: string;
  className?: string;
  gradeLevel?: string;
  schoolYear?: string;
}

export interface AnalysisAudit {
  version: string;
  analysisInputHash: string;
  klausurTextHash: string;
  erwartungshorizontHash: string;
  promptHash: string;
  systemPromptHash: string;
  seed: number;
  model: string;
  temperature: number;
  topP: number;
  ocrProvider: string;
  ocrModel: string;
  klausurFileHash?: string | null;
  erwartungshorizontFileHash?: string | null;
  sourceCorrectionId?: string;
  reusedFromCorrectionId?: string;
  generatedAt: string;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')}}`;
}

export function normalizeTextForConsistency(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashBytes(value: Uint8Array): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function buildAnalysisInputHash(input: AnalysisFingerprintInput): string {
  return hashString(
    stableStringify({
      version: CONSISTENCY_VERSION,
      klausurText: normalizeTextForConsistency(input.klausurText),
      erwartungshorizont: normalizeTextForConsistency(input.erwartungshorizont),
      subject: input.subject?.trim() ?? '',
      studentName: input.studentName?.trim() ?? '',
      className: input.className?.trim() ?? '',
      gradeLevel: input.gradeLevel?.trim() ?? '',
      schoolYear: input.schoolYear?.trim() ?? '',
    })
  );
}

export function buildPromptHash(params: {
  systemPrompt: string;
  prompt: string;
  model: string;
  temperature: number;
  topP: number;
}): string {
  return hashString(
    stableStringify({
      version: CONSISTENCY_VERSION,
      model: params.model,
      temperature: params.temperature,
      topP: params.topP,
      systemPrompt: params.systemPrompt,
      prompt: params.prompt,
    })
  );
}

/**
 * Generiert einen deterministischen Seed aus einem stabilen Fingerprint.
 *
 * Der Seed wird für OpenAI's API verwendet, um bei gleichen Inputs
 * immer die gleichen Outputs zu erhalten.
 *
 * @param primaryInput - Stabile Eingabe, z.B. Prompt- oder Input-Hash
 * @param secondaryInput - Optionaler Zusatz für Backward-Compat
 * @returns Integer zwischen 0 und 2^31-1
 */
export function generateDeterministicSeed(
  primaryInput: string,
  secondaryInput?: string
): number {
  const input = secondaryInput
    ? `${primaryInput}:${secondaryInput}`
    : primaryInput;
  const hash = hashString(input);
  // Konvertiere erste 8 Hex-Zeichen zu Integer zwischen 0 und 2^31-1
  return parseInt(hash.slice(0, 8), 16) % (2 ** 31);
}

export function createAnalysisAudit(input: {
  analysisInputHash: string;
  klausurTextHash: string;
  erwartungshorizontHash: string;
  promptHash: string;
  systemPromptHash: string;
  seed: number;
  model: string;
  temperature: number;
  topP: number;
  klausurFileHash?: string | null;
  erwartungshorizontFileHash?: string | null;
  sourceCorrectionId?: string;
  reusedFromCorrectionId?: string;
}): AnalysisAudit {
  return {
    version: CONSISTENCY_VERSION,
    analysisInputHash: input.analysisInputHash,
    klausurTextHash: input.klausurTextHash,
    erwartungshorizontHash: input.erwartungshorizontHash,
    promptHash: input.promptHash,
    systemPromptHash: input.systemPromptHash,
    seed: input.seed,
    model: input.model,
    temperature: input.temperature,
    topP: input.topP,
    ocrProvider: ANALYSIS_MODEL_CONFIG.ocrProvider,
    ocrModel: ANALYSIS_MODEL_CONFIG.ocrModel,
    klausurFileHash: input.klausurFileHash ?? null,
    erwartungshorizontFileHash: input.erwartungshorizontFileHash ?? null,
    sourceCorrectionId: input.sourceCorrectionId,
    reusedFromCorrectionId: input.reusedFromCorrectionId,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validierungsergebnis für die Analyse-Ausgabe
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validiert die Rohantwort des Master-Analyse-Calls.
 *
 * Prüft nur Felder, die das Modell wirklich liefern soll:
 * - tasks[] mit korrektem points-Format ("X/Y")
 * - Evidence in whatIsCorrect/whatIsWrong
 * - strengths/nextSteps als Arrays (dürfen leer sein, wird serverseitig ergänzt)
 *
 * Meta-Felder (studentName, class, grade, maxPoints, achievedPoints) und
 * teacherConclusion werden nach dem Call serverseitig befüllt und hier
 * bewusst NICHT geprüft.
 */
export function validateAnalysisOutput(
  output: any,
): ValidationResult {
  const errors: string[] = [];

  if (!output) {
    errors.push('Output is null or undefined');
    return { valid: false, errors };
  }

  if (!output.tasks || !Array.isArray(output.tasks)) {
    errors.push('Missing or invalid tasks array');
    return { valid: false, errors };
  }

  output.tasks.forEach((task: any, index: number) => {
    const taskId = task.taskId || `Task ${index + 1}`;

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

    if (achieved > max) {
      errors.push(
        `${taskId}: Achieved points (${achieved}) exceeds max points (${max})`
      );
    }

    const hasWhatIsCorrect = Array.isArray(task.whatIsCorrect) && task.whatIsCorrect.length > 0;
    const hasWhatIsWrong = Array.isArray(task.whatIsWrong) && task.whatIsWrong.length > 0;

    if (!hasWhatIsCorrect && !hasWhatIsWrong) {
      errors.push(
        `${taskId}: No evidence provided (both whatIsCorrect and whatIsWrong are empty)`
      );
    }

    if (!task.taskId) {
      errors.push(`Task ${index + 1}: Missing taskId`);
    }
    if (!task.taskTitle) {
      errors.push(`${taskId}: Missing taskTitle`);
    }
  });

  if (!Array.isArray(output.strengths)) {
    errors.push('strengths must be an array');
  }
  if (!Array.isArray(output.nextSteps)) {
    errors.push('nextSteps must be an array');
  }

  // Datenschutz / Kontextfelder (studentName, class, subject, grade) sowie
  // teacherConclusion werden serverseitig ergänzt und hier bewusst NICHT
  // geprüft — sonst würde der Retry-Loop unnötig feuern.
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
