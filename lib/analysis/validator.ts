import type { UniversalAnalysis, UniversalTask } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateAnalysis(analysis: any): ValidationResult {
  const errors: string[] = [];

  // Meta-Validierung
  if (!analysis.meta) {
    errors.push('meta fehlt');
  } else {
    const meta = analysis.meta;
    if (!meta.studentName) errors.push('meta.studentName fehlt');
    if (!meta.class) errors.push('meta.class fehlt');
    if (!meta.subject) errors.push('meta.subject fehlt');
    if (!meta.date) errors.push('meta.date fehlt');
    if (typeof meta.maxPoints !== 'number') errors.push('meta.maxPoints muss eine Zahl sein');
    if (typeof meta.achievedPoints !== 'number') errors.push('meta.achievedPoints muss eine Zahl sein');
    if (!meta.grade) errors.push('meta.grade fehlt');
  }

  // Tasks-Validierung
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

  // Strengths & NextSteps
  if (!Array.isArray(analysis.strengths)) errors.push('strengths muss ein Array sein');
  if (!Array.isArray(analysis.nextSteps)) errors.push('nextSteps muss ein Array sein');

  // TeacherConclusion-Validierung
  if (!analysis.teacherConclusion) {
    errors.push('teacherConclusion fehlt');
  } else {
    const tc = analysis.teacherConclusion;
    if (!tc.summary) errors.push('teacherConclusion.summary fehlt');
    if (!Array.isArray(tc.studentPatterns)) errors.push('teacherConclusion.studentPatterns muss ein Array sein');
    if (!Array.isArray(tc.learningNeeds)) errors.push('teacherConclusion.learningNeeds muss ein Array sein');
    if (!Array.isArray(tc.recommendedActions)) errors.push('teacherConclusion.recommendedActions muss ein Array sein');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Bereinigt und normalisiert die Analyse
 * WICHTIG: Berechnet Gesamtpunkte aus Einzelaufgaben, nicht aus meta (KI kann falsche Werte liefern)
 */
export function normalizeAnalysis(analysis: any): UniversalAnalysis {
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

  // Verwende berechnete Punkte, falls vorhanden, sonst Fallback auf meta
  const maxPoints = calculatedMaxPoints > 0 ? calculatedMaxPoints : (analysis.meta?.maxPoints || 0);
  const achievedPoints = calculatedAchievedPoints > 0 ? calculatedAchievedPoints : (analysis.meta?.achievedPoints || 0);

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
