/**
 * Universelle Analyse-Struktur (fachunabhängig, fachlich gefüllt)
 */

export interface UniversalAnalysis {
  meta: AnalysisMeta;
  tasks: UniversalTask[];
  strengths: string[];
  nextSteps: string[];
  teacherConclusion: TeacherConclusion;
}

export interface AnalysisMeta {
  studentName: string;
  class: string;
  subject: string;
  date: string;
  maxPoints: number;
  achievedPoints: number;
  grade: string;
  performanceLevel?: string;
}

export interface UniversalTask {
  taskId: string;
  taskTitle: string;
  points: string; // Format: "erreichtePunkte/maxPunkte"
  whatIsCorrect: string[];
  whatIsWrong: string[];
  improvementTips: string[];
  teacherCorrections: string[];
  studentFriendlyTips: string[];
  studentAnswerSummary: string;
  benoetigtManuelleKorrektur?: boolean; // True wenn Zeichnungsaufgabe mit 0 Punkten
  warnung?: string; // Warnungstext für UI
}

export interface TeacherConclusion {
  summary: string;
  studentPatterns: string[];
  learningNeeds: string[];
  recommendedActions: string[];
}

/**
 * Input für Master-Analyse
 */
export interface MasterAnalysisInput {
  klausurText: string;
  erwartungshorizont: string;
  subject?: string;
  studentName?: string;
  className?: string;
}

/**
 * Rohoutput des Master-Analyse-Calls.
 *
 * Das Modell liefert nur tasks + strengths + nextSteps. Meta-Felder und
 * teacherConclusion werden serverseitig ergänzt (siehe
 * normalizeAnalysis, getGradeInfo, generateTeacherConclusion).
 */
export interface MasterAnalysisRawOutput {
  tasks: UniversalTask[];
  strengths: string[];
  nextSteps: string[];
}

/**
 * Input für Renderer
 */
export interface RenderInput {
  analysis: UniversalAnalysis;
  target: 'teacher' | 'student';
}
