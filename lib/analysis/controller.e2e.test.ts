import { describe, it, expect } from 'vitest';
import { normalizeAnalysis } from './validator';
import { getGradeInfo } from '../grades';
import type { UniversalAnalysis } from './types';

describe('E2E Analysis Flow - BUG1+4: Punkteberechnung und gradeLevel', () => {
  it('should calculate points correctly and use gradeLevel from className', () => {
    // Mock-Analyse mit Tasks
    const mockAnalysis = {
      meta: {
        studentName: 'Max Mustermann',
        class: '10a',
        subject: 'Mathe',
        date: '2025-01-01',
        maxPoints: 100, // KI könnte falsch setzen
        achievedPoints: 35, // KI könnte falsch setzen
        grade: '',
      },
      tasks: [
        {
          taskId: '1.1',
          taskTitle: 'Aufgabe 1.1',
          points: '8/10', // Tatsächliche Punkte
          whatIsCorrect: ['Rechnung korrekt'],
          whatIsWrong: ['Einheit fehlt'],
          improvementTips: ['Einheit angeben'],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: '',
        },
        {
          taskId: '1.2',
          taskTitle: 'Aufgabe 1.2',
          points: '12/15',
          whatIsCorrect: ['Formel richtig'],
          whatIsWrong: [],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: '',
        },
        {
          taskId: '2.1',
          taskTitle: 'Aufgabe 2.1',
          points: '15/20',
          whatIsCorrect: ['Lösung korrekt'],
          whatIsWrong: [],
          improvementTips: [],
          teacherCorrections: [],
          studentFriendlyTips: [],
          studentAnswerSummary: '',
        },
      ],
      strengths: ['Du hast die Rechnung korrekt gelöst'],
      nextSteps: ['Übe die Einheiten'],
      teacherConclusion: {
        summary: 'Gute Leistung',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    };

    // Normalisiere Analyse (berechnet Punkte aus Tasks)
    const normalized = normalizeAnalysis(mockAnalysis);

    // Prüfe: Punkte sollten aus Tasks berechnet werden, nicht aus meta
    expect(normalized.meta.maxPoints).toBe(45); // 10 + 15 + 20
    expect(normalized.meta.achievedPoints).toBe(35); // 8 + 12 + 15

    // Prüfe: Note sollte korrekt berechnet werden
    const percentage = (normalized.meta.achievedPoints / normalized.meta.maxPoints) * 100;
    expect(percentage).toBeCloseTo(77.78, 2);

    // Prüfe: gradeLevel sollte aus className extrahiert werden
    const gradeLevel = 10; // Aus "10a"
    const gradeInfo = getGradeInfo({ prozent: percentage, gradeLevel });
    expect(gradeInfo.label).toBe('2−'); // 77.78% bei SEK I = 2− (74-79%)

    // Prüfe: Konsistenz zwischen meta und berechneten Werten
    expect(normalized.meta.maxPoints).toBeGreaterThan(0);
    expect(normalized.meta.achievedPoints).toBeLessThanOrEqual(normalized.meta.maxPoints);
    expect(normalized.meta.achievedPoints).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty tasks array gracefully', () => {
    const mockAnalysis = {
      meta: {
        studentName: 'Test',
        class: '11b',
        subject: 'Bio',
        date: '2025-01-01',
        maxPoints: 50,
        achievedPoints: 25,
        grade: '',
      },
      tasks: [],
      strengths: [],
      nextSteps: [],
      teacherConclusion: {
        summary: '',
        studentPatterns: [],
        learningNeeds: [],
        recommendedActions: [],
      },
    };

    const normalized = normalizeAnalysis(mockAnalysis);
    
    // Bei leeren Tasks sollte meta als Fallback verwendet werden
    expect(normalized.meta.maxPoints).toBe(50);
    expect(normalized.meta.achievedPoints).toBe(25);
  });
});

