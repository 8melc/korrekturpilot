import { describe, it, expect } from 'vitest';
import { normalizeExtractedStructure } from './extract-structure';

describe('normalizeExtractedStructure', () => {
  it('returns null for invalid inputs', () => {
    expect(normalizeExtractedStructure(null)).toBeNull();
    expect(normalizeExtractedStructure(undefined)).toBeNull();
    expect(normalizeExtractedStructure('not an object')).toBeNull();
    expect(normalizeExtractedStructure({})).toBeNull();
    expect(normalizeExtractedStructure({ tasks: 'not-an-array' })).toBeNull();
    expect(normalizeExtractedStructure({ tasks: [] })).toBeNull();
  });

  it('filters out tasks without valid taskId or maxPoints', () => {
    const result = normalizeExtractedStructure({
      tasks: [
        { taskId: '1', maxPoints: 5 },
        { taskId: '', maxPoints: 3 }, // kein taskId
        { taskId: '2' }, // kein maxPoints
        { taskId: '3', maxPoints: 0 }, // maxPoints null
        { taskId: '4', maxPoints: -1 }, // negativ
        { taskId: '5', maxPoints: 'zehn' }, // string statt number
      ],
      totalMaxPoints: 100,
    });
    expect(result?.tasks).toHaveLength(1);
    expect(result?.tasks[0].taskId).toBe('1');
  });

  it('uses totalMaxPoints if it matches the sum', () => {
    const result = normalizeExtractedStructure({
      tasks: [
        { taskId: '1', maxPoints: 6 },
        { taskId: '2', maxPoints: 4 },
      ],
      totalMaxPoints: 10,
    });
    expect(result?.totalMaxPoints).toBe(10);
  });

  it('prefers the sum over an implausible totalMaxPoints', () => {
    const result = normalizeExtractedStructure({
      tasks: [
        { taskId: '1', maxPoints: 6 },
        { taskId: '2', maxPoints: 4 },
      ],
      totalMaxPoints: 100, // stark abweichend
    });
    expect(result?.totalMaxPoints).toBe(10); // fällt zurück auf Summe
  });

  it('computes total from tasks when totalMaxPoints is missing', () => {
    const result = normalizeExtractedStructure({
      tasks: [
        { taskId: '1', maxPoints: 3 },
        { taskId: '2', maxPoints: 5 },
      ],
    });
    expect(result?.totalMaxPoints).toBe(8);
  });

  it('fills missing taskTitle with "Aufgabe <id>"', () => {
    const result = normalizeExtractedStructure({
      tasks: [{ taskId: '2a', maxPoints: 4 }],
    });
    expect(result?.tasks[0].taskTitle).toBe('Aufgabe 2a');
  });
});
