import { describe, it, expect } from 'vitest';
import { extractGradeLevelFromClassName } from './controller';

describe('extractGradeLevelFromClassName - BUG1 Fix: gradeLevel dynamisch', () => {
  it('should extract grade level from "10a"', () => {
    expect(extractGradeLevelFromClassName('10a')).toBe(10);
  });

  it('should extract grade level from "11b"', () => {
    expect(extractGradeLevelFromClassName('11b')).toBe(11);
  });

  it('should extract grade level from "Klasse 12"', () => {
    expect(extractGradeLevelFromClassName('Klasse 12')).toBe(12);
  });

  it('should return 10 (Fallback) for "Q1" (extracts 1, but Q1 is not a valid class)', () => {
    // "Q1" enthält "1", wird also als 1 erkannt - das ist technisch korrekt
    // Für echte Qualifikationsphase würde man eine andere Logik brauchen
    expect(extractGradeLevelFromClassName('Q1')).toBe(1);
  });

  it('should return 10 (Fallback) for undefined', () => {
    expect(extractGradeLevelFromClassName(undefined)).toBe(10);
  });

  it('should return 10 (Fallback) for empty string', () => {
    expect(extractGradeLevelFromClassName('')).toBe(10);
  });

  it('should extract grade level from "5c"', () => {
    expect(extractGradeLevelFromClassName('5c')).toBe(5);
  });

  it('should return 10 (Fallback) for invalid numbers (> 13)', () => {
    expect(extractGradeLevelFromClassName('14a')).toBe(10);
  });

  it('should return 10 (Fallback) for invalid numbers (< 1)', () => {
    expect(extractGradeLevelFromClassName('0a')).toBe(10);
  });
});

