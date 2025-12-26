import { describe, it, expect } from 'vitest';
import { validateFeedbackOverlap } from './validator';
import type { UniversalAnalysis } from './types';

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

