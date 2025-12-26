import { describe, it, expect } from 'vitest';
import { getGradeInfo } from './grades';

describe('getGradeInfo - BUG2 Fix: 29-32% = 5-', () => {
  const gradeLevel = 10; // SEK I

  it('26-28% should return "5"', () => {
    expect(getGradeInfo({ prozent: 26, gradeLevel }).label).toBe('5');
    expect(getGradeInfo({ prozent: 27, gradeLevel }).label).toBe('5');
    expect(getGradeInfo({ prozent: 28, gradeLevel }).label).toBe('5');
  });

  it('29-32% should return "5−" (BUG2 Fix)', () => {
    expect(getGradeInfo({ prozent: 29, gradeLevel }).label).toBe('5−');
    expect(getGradeInfo({ prozent: 30, gradeLevel }).label).toBe('5−');
    expect(getGradeInfo({ prozent: 31, gradeLevel }).label).toBe('5−');
    expect(getGradeInfo({ prozent: 32, gradeLevel }).label).toBe('5−');
  });

  it('33-35% should return "5+"', () => {
    expect(getGradeInfo({ prozent: 33, gradeLevel }).label).toBe('5+');
    expect(getGradeInfo({ prozent: 34, gradeLevel }).label).toBe('5+');
    expect(getGradeInfo({ prozent: 35, gradeLevel }).label).toBe('5+');
  });

  it('Edge cases: 29%, 32%, 33%', () => {
    expect(getGradeInfo({ prozent: 29, gradeLevel }).label).toBe('5−');
    expect(getGradeInfo({ prozent: 32, gradeLevel }).label).toBe('5−');
    expect(getGradeInfo({ prozent: 33, gradeLevel }).label).toBe('5+');
  });
});

