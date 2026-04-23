import type { UniversalAnalysis, UniversalTask } from './types';
import type { KlausurStructure } from './extract-structure';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validiert die Rohantwort des Master-Analyse-Calls.
 *
 * Der Master-Call liefert jetzt nur noch tasks, strengths und nextSteps.
 * Meta-Felder (maxPoints, achievedPoints, grade, studentName usw.) und
 * teacherConclusion werden serverseitig ergänzt. Sie werden deshalb hier
 * NICHT als required geprüft.
 */
export function validateAnalysis(analysis: any): ValidationResult {
  const errors: string[] = [];

  if (!analysis || typeof analysis !== 'object') {
    errors.push('Analyse-Objekt fehlt oder ist ungültig');
    return { isValid: false, errors };
  }

  // meta-Felder werden im Controller/Route serverseitig befüllt (siehe
  // analysis.meta = analysis.meta || {} in app/api/analyze/route.ts).
  // Hier daher keine required-Checks auf meta mehr.

  // Tasks sind das einzige Pflichtfeld auf Struktur-Ebene
  if (!Array.isArray(analysis.tasks)) {
    errors.push('tasks muss ein Array sein');
  } else {
    analysis.tasks.forEach((task: any, index: number) => {
      if (!task.taskId) errors.push(`tasks[${index}].taskId fehlt`);
      if (!task.taskTitle) errors.push(`tasks[${index}].taskTitle fehlt`);
      if (!task.points) errors.push(`tasks[${index}].points fehlt`);
      if (!Array.isArray(task.whatIsCorrect)) errors.push(`tasks[${index}].whatIsCorrect muss ein Array sein`);
      if (!Array.isArray(task.whatIsWrong)) errors.push(`tasks[${index}].whatIsWrong muss ein Array sein`);
      if (!Array.isArray(task.improvementTips)) errors.push(`tasks[${index}].improvementTips muss ein Array sein`);
      if (!Array.isArray(task.teacherCorrections)) errors.push(`tasks[${index}].teacherCorrections muss ein Array sein`);
      if (!Array.isArray(task.studentFriendlyTips)) errors.push(`tasks[${index}].studentFriendlyTips muss ein Array sein`);
    });
  }

  // strengths/nextSteps müssen Arrays sein, dürfen aber leer sein
  if (!Array.isArray(analysis.strengths)) errors.push('strengths muss ein Array sein');
  if (!Array.isArray(analysis.nextSteps)) errors.push('nextSteps muss ein Array sein');

  // Auto-fix teacherConclusion, falls das Modell es trotzdem liefert
  // (Kompatibilität mit älteren Prompts; required ist es NICHT mehr).
  if (analysis.teacherConclusion && typeof analysis.teacherConclusion === 'object') {
    const tc = analysis.teacherConclusion;
    if (typeof tc.studentPatterns === 'string') tc.studentPatterns = [tc.studentPatterns];
    if (typeof tc.learningNeeds === 'string') tc.learningNeeds = [tc.learningNeeds];
    if (typeof tc.recommendedActions === 'string') tc.recommendedActions = [tc.recommendedActions];
    if (!Array.isArray(tc.studentPatterns)) tc.studentPatterns = [];
    if (!Array.isArray(tc.learningNeeds)) tc.learningNeeds = [];
    if (!Array.isArray(tc.recommendedActions)) tc.recommendedActions = [];
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface NormalizeOptions {
  /**
   * Autoritative Klausur-Struktur (aus Erwartungshorizont extrahiert).
   * Wenn vorhanden, werden Maximalpunkte aus dieser Quelle verwendet,
   * und im KI-Output fehlende Aufgaben werden als "0/max" ergänzt.
   */
  authoritativeStructure?: KlausurStructure;
  /**
   * Manuell eingegebene Gesamtpunktzahl der Klausur (Variant 2).
   * Überschreibt die berechneten Maximalpunkte. Hat Vorrang vor
   * authoritativeStructure.totalMaxPoints.
   */
  expectedMaxPoints?: number;
}

/**
 * Bereinigt und normalisiert die Analyse.
 *
 * Reihenfolge der Maximalpunkte-Quellen (absteigend nach Priorität):
 *   1. expectedMaxPoints (Lehrer-Input)
 *   2. authoritativeStructure.totalMaxPoints (aus Erwartungshorizont extrahiert)
 *   3. Summe der Task-Punkte aus der KI-Antwort
 *   4. analysis.meta.maxPoints (veralteter Fallback)
 */
export function normalizeAnalysis(
  analysis: any,
  options: NormalizeOptions = {},
): UniversalAnalysis {
  const tasks = (analysis.tasks || []).map((task: any) => {
    // Prüfe ob es eine Zeichnungsaufgabe ist
    const istZeichnungsAufgabe = 
      (task.taskTitle || '').toLowerCase().includes('zeichnen') ||
      (task.taskTitle || '').toLowerCase().includes('strukturformel') ||
      (task.taskTitle || '').toLowerCase().includes('darstellen');
    
    // Parse points string "erreichtePunkte/maxPunkte"
    const pointsMatch = (task.points || '0/0').match(/^(\d+)\/(\d+)$/);
    const erreichtePunkte = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;
    
    // Warnung für Zeichnungsaufgaben mit 0 Punkten
    const benoetigtManuelleKorrektur = istZeichnungsAufgabe && erreichtePunkte === 0;
    const warnung = benoetigtManuelleKorrektur 
      ? "⚠️ Strukturformel-Aufgabe mit 0 Punkten - Die KI hat Schwierigkeiten bei handgezeichneten Strukturformeln. Bitte manuell überprüfen!"
      : undefined;
    
    return {
      taskId: task.taskId || '',
      taskTitle: task.taskTitle || '',
      points: task.points || '0/0',
      whatIsCorrect: Array.isArray(task.whatIsCorrect) ? task.whatIsCorrect : [],
      whatIsWrong: Array.isArray(task.whatIsWrong) ? task.whatIsWrong : [],
      improvementTips: Array.isArray(task.improvementTips) ? task.improvementTips : [],
      teacherCorrections: Array.isArray(task.teacherCorrections) ? task.teacherCorrections : [],
      studentFriendlyTips: Array.isArray(task.studentFriendlyTips) ? task.studentFriendlyTips : [],
      studentAnswerSummary: task.studentAnswerSummary || '',
      benoetigtManuelleKorrektur,
      warnung,
    };
  });

  // Korrigiere Punkte für leere/verweigerte Aufgaben
  const NOT_ATTEMPTED_PHRASES = [
    'weiß ich nicht', 'weiß nicht', 'keine ahnung',
    'nicht bearbeitet', 'keine antwort', 'weis nicht',
    'weiss nicht', 'kein plan',
  ];

  tasks.forEach((task: UniversalTask) => {
    const answer = (task.studentAnswerSummary || '').toLowerCase().trim();
    const isBlank = answer === '' || answer === '-' || answer === '/';
    const isExplicitlySkipped = NOT_ATTEMPTED_PHRASES.some(p => answer.includes(p));

    if (isBlank || isExplicitlySkipped) {
      const pointsMatch = task.points.match(/^(\d+)\/(\d+)$/);
      const achieved = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;
      if (achieved > 0) {
        const max = pointsMatch ? pointsMatch[2] : '0';
        console.warn(`[Konsistenz] Punkte für leere Aufgabe korrigiert: ${task.taskId} war ${achieved}/${max}, wird 0/${max}`);
        task.points = `0/${max}`;
      }
    }
  });

  // Wenn eine autoritative Klausur-Struktur vorhanden ist: fehlende Aufgaben
  // als "0/max" ergänzen. Verhindert, dass die Gesamt-Max-Punktzahl zwischen
  // Schülerinnen derselben Klausur schwankt, nur weil die KI in einer
  // Schülerklausur weniger Aufgaben identifiziert hat (z. B. wegen OCR-Lücken
  // oder leerer Antworten).
  if (options.authoritativeStructure) {
    const normalizeId = (id: string) => id.trim().toLowerCase().replace(/\s+/g, '');
    const presentIds = new Set(tasks.map((t: UniversalTask) => normalizeId(t.taskId)));
    for (const structTask of options.authoritativeStructure.tasks) {
      if (!presentIds.has(normalizeId(structTask.taskId))) {
        tasks.push({
          taskId: structTask.taskId,
          taskTitle: structTask.taskTitle,
          points: `0/${structTask.maxPoints}`,
          whatIsCorrect: [],
          whatIsWrong: [],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: '',
          benoetigtManuelleKorrektur: true,
          warnung: `⚠️ Aufgabe ${structTask.taskId} wurde in der Schülerklausur nicht gefunden — bitte manuell prüfen (evtl. OCR-Lücke oder nicht bearbeitet).`,
        });
        console.warn(`[Struktur] Aufgabe ${structTask.taskId} fehlte im KI-Output, als 0/${structTask.maxPoints} ergänzt.`);
      }
    }
  }

  // KRITISCH: Berechne Gesamtpunkte aus Einzelaufgaben (KI kann falsche Werte in meta liefern)
  let calculatedMaxPoints = 0;
  let calculatedAchievedPoints = 0;

  tasks.forEach((task: UniversalTask) => {
    // Parse points string "erreichtePunkte/maxPunkte"
    const pointsMatch = task.points.match(/^(\d+)\/(\d+)$/);
    if (pointsMatch) {
      const achieved = parseInt(pointsMatch[1], 10);
      const max = parseInt(pointsMatch[2], 10);
      calculatedAchievedPoints += achieved;
      calculatedMaxPoints += max;
    }
  });

  // Maximalpunkte nach Priorität:
  //   1. Lehrer-Input (expectedMaxPoints) — überschreibt alles
  //   2. Autoritative Struktur aus Erwartungshorizont
  //   3. Summe der Task-Punkte (KI)
  //   4. Alter Fallback aus analysis.meta
  const authoritativeMax = options.authoritativeStructure?.totalMaxPoints;
  const maxPoints =
    (typeof options.expectedMaxPoints === 'number' && options.expectedMaxPoints > 0
      ? options.expectedMaxPoints
      : undefined) ??
    (typeof authoritativeMax === 'number' && authoritativeMax > 0 ? authoritativeMax : undefined) ??
    (calculatedMaxPoints > 0 ? calculatedMaxPoints : analysis.meta?.maxPoints || 0);

  const achievedPoints =
    calculatedAchievedPoints > 0
      ? Math.min(calculatedAchievedPoints, maxPoints)
      : analysis.meta?.achievedPoints || 0;

  if (calculatedMaxPoints > 0 && maxPoints > 0 && calculatedMaxPoints !== maxPoints) {
    console.warn(
      `[Konsistenz] Max-Punkt-Abweichung: KI-Summe ${calculatedMaxPoints}, verwendet ${maxPoints} ` +
        `(Quelle: ${options.expectedMaxPoints ? 'Lehrer-Input' : authoritativeMax ? 'Erwartungshorizont-Struktur' : 'KI'})`,
    );
  }

  // Berechne Prozentsatz
  const percentage = maxPoints > 0 ? (achievedPoints / maxPoints) * 100 : 0;

  const normalized: UniversalAnalysis = {
    meta: {
      studentName: analysis.meta?.studentName || '',
      class: analysis.meta?.class || '',
      subject: analysis.meta?.subject || '',
      date: analysis.meta?.date || new Date().toISOString().split('T')[0],
      maxPoints,
      achievedPoints,
      grade: analysis.meta?.grade || '', // Wird später basierend auf korrekten Punkten berechnet
    },
    tasks,
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    nextSteps: Array.isArray(analysis.nextSteps) ? analysis.nextSteps : [],
    teacherConclusion: {
      summary: analysis.teacherConclusion?.summary || '',
      studentPatterns: Array.isArray(analysis.teacherConclusion?.studentPatterns)
        ? analysis.teacherConclusion.studentPatterns
        : [],
      learningNeeds: Array.isArray(analysis.teacherConclusion?.learningNeeds)
        ? analysis.teacherConclusion.learningNeeds
        : [],
      recommendedActions: Array.isArray(analysis.teacherConclusion?.recommendedActions)
        ? analysis.teacherConclusion.recommendedActions
        : [],
    },
  };
  
  return validateFeedbackOverlap(normalized); // BUG3 Fix: Overlap-Check
}

/**
 * Validiert und entfernt inhaltliche Overlaps zwischen strengths und nextSteps
 * BUG3 Fix: Verhindert widersprüchliche Feedback-Items
 */
export function validateFeedbackOverlap(normalized: UniversalAnalysis): UniversalAnalysis {
  const strengths = normalized.strengths || [];
  const nextSteps = normalized.nextSteps || [];
  
  // Prüfe inhaltlichen Overlap (gleiche Keywords/Aufgaben)
  const overlappingNextSteps: string[] = [];
  
  strengths.forEach((strength: string) => {
    const strengthLower = strength.toLowerCase();
    // Extrahiere Substantive/Nomen (Wörter > 4 Zeichen, die nicht Stop-Wörter sind)
    const stopWords = ['du', 'hast', 'die', 'der', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'eines', 'kannst', 'solltest', 'sollst', 'musst', 'wirst'];
    const strengthWords = strengthLower
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.includes(w))
      .map(w => w.replace(/[.,!?;:]/g, '')); // Entferne Satzzeichen
    
    nextSteps.forEach((step: string) => {
      const stepLower = step.toLowerCase();
      const stepWords = stepLower
        .split(/\s+/)
        .filter(w => w.length > 4 && !stopWords.includes(w))
        .map(w => w.replace(/[.,!?;:]/g, ''));
      
      // Prüfe ob gemeinsame Schlüsselwörter vorhanden sind (exakte Übereinstimmung oder Teilwort)
      const hasOverlap = strengthWords.some(word => 
        stepWords.some(stepWord => 
          stepWord === word || stepWord.includes(word) || word.includes(stepWord)
        )
      );
      
      if (hasOverlap && !overlappingNextSteps.includes(step)) {
        overlappingNextSteps.push(step);
      }
    });
  });
  
  if (overlappingNextSteps.length > 0) {
    console.warn('🔥 FEEDBACK OVERLAP gefunden:', overlappingNextSteps);
    // Entferne Overlap aus nextSteps (priorisiere strengths)
    normalized.nextSteps = nextSteps.filter(step => !overlappingNextSteps.includes(step));
  }
  
  return normalized;
}
