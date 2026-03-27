import type { KlausurAnalyse } from '../openai';
import type { UniversalAnalysis } from './types';
import { getGradeInfo, getPerformanceLevel } from '../grades';

/**
 * Mappt KlausurAnalyse zu UniversalAnalysis
 * Für die neue AI-Pipeline
 */
export function mapToUniversalAnalysis(
  analysis: KlausurAnalyse,
  meta: {
    studentName: string;
    className: string;
    subject: string;
    schoolYear: string;
    gradeLevel?: number;
  }
): UniversalAnalysis {
  const percentage = (analysis.erreichtePunkte / analysis.gesamtpunkte) * 100;
  const gradeLevel = meta.gradeLevel || 10;
  const gradeInfo = getGradeInfo({ prozent: percentage, gradeLevel });
  const gradeLabel = gradeInfo.label;
  const perf = getPerformanceLevel(percentage);
  
  return {
    meta: {
      studentName: meta.studentName,
      class: meta.className,
      subject: meta.subject,
      date: new Date().toISOString().split('T')[0],
      maxPoints: analysis.gesamtpunkte,
      achievedPoints: analysis.erreichtePunkte,
      grade: gradeLabel,
      performanceLevel: perf,
    },
    tasks: analysis.aufgaben.map((task, idx) => ({
      taskId: `task-${idx + 1}`,
      taskTitle: task.aufgabe,
      points: `${task.erreichtePunkte}/${task.maxPunkte}`,
      whatIsCorrect: parseWhatIsCorrect(task.kommentar),
      whatIsWrong: parseWhatIsWrong(task.kommentar),
      improvementTips: parseImprovementTips(task.kommentar),
      teacherCorrections: task.korrekturen || [],
      studentFriendlyTips: [],
      studentAnswerSummary: '',
    })),
    strengths: [], // Wird von renderForStudent generiert
    nextSteps: [], // Wird von renderForStudent generiert
    teacherConclusion: {
      summary: analysis.zusammenfassung,
      studentPatterns: [],
      learningNeeds: [],
      recommendedActions: [],
    },
  };
}

function parseWhatIsCorrect(block: string): string[] {
  const match = block.match(
    /DAS WAR RICHTIG[:\s]*([\s\S]*?)(?:HIER GAB ES ABZÜGE|VERBESSERUNGSTIPP|$)/i
  );
  if (!match) return [];
  return match[1]
    .split(/[•\-\*]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseWhatIsWrong(block: string): string[] {
  const match = block.match(
    /HIER GAB ES ABZÜGE[:\s]*([\s\S]*?)(?:VERBESSERUNGSTIPP|$)/i
  );
  if (!match) return [];
  return match[1]
    .split(/[•\-\*]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseImprovementTips(block: string): string[] {
  const match = block.match(/VERBESSERUNGSTIPP[:\s]*([\s\S]*?)$/i);
  if (!match) return [];
  return match[1]
    .split(/[•\-\*]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Mappt UniversalAnalysis zurück zu KlausurAnalyse
 * Damit die bestehende UI (ResultCompactView, Renderer etc.) funktioniert
 */
export function mapToKlausurAnalyse(analysis: UniversalAnalysis): KlausurAnalyse {
  const maxPoints = analysis.meta?.maxPoints ?? 0;
  const achievedPoints = analysis.meta?.achievedPoints ?? 0;
  const prozent = maxPoints > 0 ? Math.round((achievedPoints / maxPoints) * 100) : 0;

  return {
    gesamtpunkte: maxPoints,
    erreichtePunkte: achievedPoints,
    prozent,
    aufgaben: (analysis.tasks || []).map((task) => {
      const pointsMatch = task.points?.match(/^(\d+)\/(\d+)$/);
      const erreicht = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;
      const max = pointsMatch ? parseInt(pointsMatch[2], 10) : 0;

      // Baue Kommentar aus den einzelnen Feldern zusammen
      const parts: string[] = [];
      if (task.whatIsCorrect?.length) {
        parts.push('DAS WAR RICHTIG:\n' + task.whatIsCorrect.map(s => `• ${s}`).join('\n'));
      }
      if (task.whatIsWrong?.length) {
        parts.push('HIER GAB ES ABZÜGE:\n' + task.whatIsWrong.map(s => `• ${s}`).join('\n'));
      }
      if (task.improvementTips?.length) {
        parts.push('VERBESSERUNGSTIPP:\n' + task.improvementTips.map(s => `• ${s}`).join('\n'));
      }

      return {
        aufgabe: task.taskTitle || task.taskId || '',
        maxPunkte: max,
        erreichtePunkte: erreicht,
        kommentar: parts.join('\n\n') || task.studentAnswerSummary || '',
        korrekturen: task.teacherCorrections || [],
      };
    }),
    zusammenfassung: analysis.teacherConclusion?.summary || '',
    // Preserve universal fields for components that can use them
    ...analysis,
  };
}

