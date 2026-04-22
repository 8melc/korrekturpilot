import type { UniversalAnalysis, UniversalTask } from '../types';

export const TEACHER_CONCLUSION_INSTRUCTIONS = `Erstelle den teacherConclusion-Abschnitt:

teacherConclusion.summary:
- 8-12 Sätze, die Leistungsbild, Arbeitsweise und Denkstil beschreiben.
- Keine Aufgabe-für-Aufgabe-Auflistung; übergreifende Muster beschreiben.
- Aufbau: Gesamteindruck → zentrale Stärken → Entwicklungsbereiche → motivierender Abschluss.

teacherConclusion.studentPatterns:
- typische Muster, Denkfehler oder Arbeitsgewohnheiten.

teacherConclusion.learningNeeds:
- konkrete Lernbedarfe ("Braucht Übung bei...").

teacherConclusion.recommendedActions:
- klare, fachlich sinnvolle Maßnahmen für Lehrkräfte.
- Wiederholungsinhalte, geeignete Übungsformen, methodische Hinweise.

Formulierung:
- dritte Person ("Die Schülerin / der Schüler…", "Die Leistung zeigt…").
- fachlich-sachlich, nicht emotional.
- klare, umsetzbare Aussagen.`;

export const TEACHER_CONCLUSION_SYSTEM_PROMPT = `Du bist eine erfahrene Lehrkraft. Du formulierst die pädagogische Gesamtbewertung einer bereits analysierten Klausur.

REGELN:
- Du bewertest NICHT neu. Die Einzelaufgaben-Analyse ist bereits gemacht.
- Du fasst zusammen, erkennst Muster, benennst Lernbedarfe und gibst Handlungsempfehlungen.
- Antworte ausschließlich mit gültigem JSON nach folgendem Schema:
  { "summary": "", "studentPatterns": [], "learningNeeds": [], "recommendedActions": [] }
- Keine Meta-Felder, keine Task-Neubewertung, keine Punkte.
- Deutsch, vollständige Sätze, dritte Person.`;

interface TeacherConclusionInput {
  tasks: UniversalTask[];
  meta: {
    maxPoints: number;
    achievedPoints: number;
    grade?: string;
  };
  subject?: string;
}

export function buildTeacherConclusionPrompt(input: TeacherConclusionInput): string {
  const { tasks, meta, subject } = input;
  const percentage = meta.maxPoints > 0
    ? Math.round((meta.achievedPoints / meta.maxPoints) * 100)
    : 0;

  return `${TEACHER_CONCLUSION_INSTRUCTIONS}

KONTEXT:
${subject ? `Fach: ${subject}\n` : ''}Gesamtleistung: ${meta.achievedPoints}/${meta.maxPoints} Punkte (${percentage}%)${meta.grade ? `, Note ${meta.grade}` : ''}

AUFGABEN-ZUSAMMENFASSUNG:
${buildCompactTasksSummary(tasks)}

GIB ZURÜCK: Nur das JSON-Objekt mit summary, studentPatterns, learningNeeds, recommendedActions. Keine Erläuterungen.`;
}

function buildCompactTasksSummary(tasks: UniversalTask[]): string {
  return tasks
    .map((task) => {
      const correct = task.whatIsCorrect.slice(0, 2).join('; ');
      const wrong = task.whatIsWrong.slice(0, 2).join('; ');
      const tips = task.improvementTips.slice(0, 1).join('; ');
      return [
        `Aufgabe ${task.taskTitle || task.taskId} (${task.points}):`,
        correct ? `  + ${correct}` : null,
        wrong ? `  - ${wrong}` : null,
        tips ? `  → ${tips}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

export function emptyTeacherConclusion(): UniversalAnalysis['teacherConclusion'] {
  return {
    summary: '',
    studentPatterns: [],
    learningNeeds: [],
    recommendedActions: [],
  };
}
