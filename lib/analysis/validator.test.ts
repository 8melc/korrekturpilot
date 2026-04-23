import { describe, it, expect } from 'vitest';
import { validateAnalysis, validateFeedbackOverlap, normalizeAnalysis } from './validator';
import type { UniversalAnalysis } from './types';

describe('validateAnalysis - Meta-Fallbacks', () => {
  it('does not require studentName and grade during schema validation', () => {
    const result = validateAnalysis({
      meta: {
        class: '10a',
        subject: 'Mathe',
        date: '2025-01-01',
        maxPoints: 20,
        achievedPoints: 15,
      },
      tasks: [],
      strengths: [],
      nextSteps: [],
      teacherConclusion: {
        summary: 'Solide Leistung.',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).not.toContain('meta.studentName fehlt');
    expect(result.errors).not.toContain('meta.grade fehlt');
  });
});

describe('validateFeedbackOverlap - BUG3 Fix: Feedback Overlap-Validierung', () => {
  it('should remove nextStep when it overlaps with strength (Rechnung)', () => {
    const analysis: UniversalAnalysis = {
      meta: {
        studentName: 'Test',
        class: '10a',
        subject: 'Mathe',
        date: '2025-01-01',
        maxPoints: 100,
        achievedPoints: 50,
        grade: '3',
      },
      tasks: [],
      strengths: ['Du hast die Rechnung korrekt gelöst'],
      nextSteps: ['Übe die Rechnung noch genauer'],
      teacherConclusion: {
        summary: '',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    };

    const result = validateFeedbackOverlap(analysis);
    expect(result.nextSteps).toEqual([]);
    expect(result.strengths).toEqual(['Du hast die Rechnung korrekt gelöst']);
  });

  it('should remove nextStep when it overlaps with strength (Fachbegriffe)', () => {
    const analysis: UniversalAnalysis = {
      meta: {
        studentName: 'Test',
        class: '10a',
        subject: 'Bio',
        date: '2025-01-01',
        maxPoints: 100,
        achievedPoints: 50,
        grade: '3',
      },
      tasks: [],
      strengths: ['Du hast die Fachbegriffe korrekt verwendet'],
      nextSteps: ['Übe die Fachbegriffe noch genauer'],
      teacherConclusion: {
        summary: '',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    };

    const result = validateFeedbackOverlap(analysis);
    expect(result.nextSteps).toEqual([]);
    expect(result.strengths).toEqual(['Du hast die Fachbegriffe korrekt verwendet']);
  });

  it('should keep both arrays unchanged when there is no overlap', () => {
    const analysis: UniversalAnalysis = {
      meta: {
        studentName: 'Test',
        class: '10a',
        subject: 'Deutsch',
        date: '2025-01-01',
        maxPoints: 100,
        achievedPoints: 50,
        grade: '3',
      },
      tasks: [],
      strengths: ['Du hast die Rechtschreibung korrekt'],
      nextSteps: ['Übe die Grammatik'],
      teacherConclusion: {
        summary: '',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    };

    const result = validateFeedbackOverlap(analysis);
    expect(result.nextSteps).toEqual(['Übe die Grammatik']);
    expect(result.strengths).toEqual(['Du hast die Rechtschreibung korrekt']);
  });

  it('should accept a master-call raw output without meta and without teacherConclusion', () => {
    const rawOutput = {
      tasks: [
        {
          taskId: '1',
          taskTitle: 'Aufgabe 1',
          points: '3/5',
          whatIsCorrect: ['Gut gelöst'],
          whatIsWrong: [],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: '',
        },
      ],
      strengths: ['Du hast die Aufgabe verstanden'],
      nextSteps: ['Übe die Rechnung'],
    };

    const result = validateAnalysis(rawOutput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should still flag tasks array structure problems', () => {
    const invalid = {
      tasks: [
        {
          taskId: '1',
          taskTitle: 'Aufgabe 1',
          points: '3/5',
          whatIsCorrect: 'not an array',
          whatIsWrong: [],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: '',
        },
      ],
      strengths: [],
      nextSteps: [],
    };

    const result = validateAnalysis(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('whatIsCorrect'))).toBe(true);
  });

  it('normalizeAnalysis should compute meta from tasks when raw output lacks meta', () => {
    const rawOutput = {
      tasks: [
        {
          taskId: '1',
          taskTitle: 'A1',
          points: '4/5',
          whatIsCorrect: ['Richtige Rechnung'],
          whatIsWrong: [],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: 'Die Schülerin hat die Aufgabe richtig gelöst.',
        },
        {
          taskId: '2',
          taskTitle: 'A2',
          points: '2/10',
          whatIsCorrect: ['Ansatz erkennbar'],
          whatIsWrong: ['Einheit fehlt'],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: 'Die Schülerin hat einen Ansatz aufgeschrieben.',
        },
      ],
      strengths: [],
      nextSteps: [],
    };

    const normalized = normalizeAnalysis(rawOutput);
    expect(normalized.meta.maxPoints).toBe(15);
    expect(normalized.meta.achievedPoints).toBe(6);
    expect(normalized.teacherConclusion.summary).toBe('');
    expect(normalized.teacherConclusion.studentPatterns).toEqual([]);
  });

  it('normalizeAnalysis uses expectedMaxPoints as authoritative maximum when provided', () => {
    const rawOutput = {
      tasks: [
        {
          taskId: '1', taskTitle: 'A1', points: '4/5',
          whatIsCorrect: ['ok'], whatIsWrong: [], improvementTips: [],
          teacherCorrections: [], studentFriendlyTips: [],
          studentAnswerSummary: 'Antwort vorhanden.',
        },
      ],
      strengths: [], nextSteps: [],
    };

    const normalized = normalizeAnalysis(rawOutput, { expectedMaxPoints: 28 });
    expect(normalized.meta.maxPoints).toBe(28);
    expect(normalized.meta.achievedPoints).toBe(4);
  });

  it('normalizeAnalysis fills missing tasks from authoritativeStructure as 0/max', () => {
    const rawOutput = {
      // KI hat nur Aufgabe 1 und 2 erkannt
      tasks: [
        {
          taskId: '1', taskTitle: 'A1', points: '4/6',
          whatIsCorrect: ['ok'], whatIsWrong: [], improvementTips: [],
          teacherCorrections: [], studentFriendlyTips: [],
          studentAnswerSummary: 'Antwort vorhanden.',
        },
        {
          taskId: '2', taskTitle: 'A2', points: '3/6',
          whatIsCorrect: ['ok'], whatIsWrong: [], improvementTips: [],
          teacherCorrections: [], studentFriendlyTips: [],
          studentAnswerSummary: 'Antwort vorhanden.',
        },
      ],
      strengths: [], nextSteps: [],
    };
    // Erwartungshorizont sagt: 4 Aufgaben gesamt, 28 Punkte
    const authoritativeStructure = {
      tasks: [
        { taskId: '1', taskTitle: 'A1', maxPoints: 6 },
        { taskId: '2', taskTitle: 'A2', maxPoints: 6 },
        { taskId: '3', taskTitle: 'A3', maxPoints: 8 },
        { taskId: '4', taskTitle: 'A4', maxPoints: 8 },
      ],
      totalMaxPoints: 28,
    };

    const normalized = normalizeAnalysis(rawOutput, { authoritativeStructure });
    expect(normalized.meta.maxPoints).toBe(28);
    expect(normalized.meta.achievedPoints).toBe(7); // 4 + 3, fehlende Aufgaben geben 0
    expect(normalized.tasks).toHaveLength(4);
    const task3 = normalized.tasks.find((t) => t.taskId === '3');
    expect(task3?.points).toBe('0/8');
    expect(task3?.benoetigtManuelleKorrektur).toBe(true);
  });

  it('normalizeAnalysis: expectedMaxPoints has priority over authoritativeStructure', () => {
    const rawOutput = {
      tasks: [
        {
          taskId: '1', taskTitle: 'A1', points: '4/5',
          whatIsCorrect: ['ok'], whatIsWrong: [], improvementTips: [],
          teacherCorrections: [], studentFriendlyTips: [],
          studentAnswerSummary: 'Antwort.',
        },
      ],
      strengths: [], nextSteps: [],
    };
    const authoritativeStructure = {
      tasks: [{ taskId: '1', taskTitle: 'A1', maxPoints: 5 }],
      totalMaxPoints: 5,
    };

    const normalized = normalizeAnalysis(rawOutput, {
      authoritativeStructure,
      expectedMaxPoints: 30, // Lehrer überschreibt
    });
    expect(normalized.meta.maxPoints).toBe(30);
  });

  it('normalizeAnalysis: achievedPoints werden auf maxPoints gekappt falls KI zu viel vergibt', () => {
    const rawOutput = {
      tasks: [
        {
          taskId: '1', taskTitle: 'A1', points: '40/10', // KI vergibt mehr als max (abnormal)
          whatIsCorrect: ['ok'], whatIsWrong: [], improvementTips: [],
          teacherCorrections: [], studentFriendlyTips: [],
          studentAnswerSummary: 'Antwort.',
        },
      ],
      strengths: [], nextSteps: [],
    };

    const normalized = normalizeAnalysis(rawOutput, { expectedMaxPoints: 10 });
    expect(normalized.meta.maxPoints).toBe(10);
    expect(normalized.meta.achievedPoints).toBeLessThanOrEqual(10);
  });

  it('should remove multiple overlapping nextSteps', () => {
    const analysis: UniversalAnalysis = {
      meta: {
        studentName: 'Test',
        class: '10a',
        subject: 'Mathe',
        date: '2025-01-01',
        maxPoints: 100,
        achievedPoints: 50,
        grade: '3',
      },
      tasks: [],
      strengths: ['Du hast die Rechnung korrekt gelöst', 'Du hast die Formeln richtig angewendet'],
      nextSteps: ['Übe die Rechnung noch genauer', 'Übe die Formeln noch genauer', 'Wiederhole die Algebra'],
      teacherConclusion: {
        summary: '',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    };

    const result = validateFeedbackOverlap(analysis);
    expect(result.nextSteps).toEqual(['Wiederhole die Algebra']);
    expect(result.strengths.length).toBe(2);
  });
});
