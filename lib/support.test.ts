import { describe, expect, it } from 'vitest';
import { validateSupportRequest } from './support';

describe('validateSupportRequest', () => {
  it('accepts a valid payload', () => {
    const result = validateSupportRequest({
      requestType: 'problem',
      productArea: 'analysis',
      subject: 'Analyse bricht nach Upload ab',
      actualBehavior: 'Nach dem Upload erscheint ein Fehler und die Analyse startet nicht.',
      expectedBehavior: 'Die Analyse sollte nach dem Upload normal starten.',
      reproductionSteps: '1. PDF hochladen 2. Erwartungshorizont auswählen 3. Start klicken',
      relatedCorrectionId: 'abc-123',
      relatedFileName: 'Klausur_01.pdf',
      deviceContext: 'Chrome auf macOS',
      screenshotAvailable: true,
    });

    expect(result.ok).toBe(true);
    expect(result.data?.requestType).toBe('problem');
    expect(result.data?.screenshotAvailable).toBe(true);
  });

  it('rejects invalid request types', () => {
    const result = validateSupportRequest({
      requestType: 'bug',
      productArea: 'analysis',
      subject: 'Analysefehler',
      actualBehavior: 'Die Analyse stoppt nach dem Upload.',
      expectedBehavior: 'Die Analyse sollte durchlaufen.',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Ungültiger Anliegen-Typ.');
  });

  it('rejects missing required text fields', () => {
    const result = validateSupportRequest({
      requestType: 'problem',
      productArea: 'upload',
      subject: 'Kurz',
      actualBehavior: 'zu kurz',
      expectedBehavior: '',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('trims optional values and converts empties to null', () => {
    const result = validateSupportRequest({
      requestType: 'feedback',
      productArea: 'results',
      subject: ' Ergebnisansicht verbessern ',
      actualBehavior: ' Die Detailansicht ist für mich an einigen Stellen noch schwer lesbar. ',
      expectedBehavior: ' Ich hätte gern klarere Zwischenüberschriften und mehr Abstand. ',
      relatedCorrectionId: '   ',
      relatedFileName: '   Klausur_03.pdf   ',
      deviceContext: '   Safari auf iPad   ',
    });

    expect(result.ok).toBe(true);
    expect(result.data?.subject).toBe('Ergebnisansicht verbessern');
    expect(result.data?.relatedCorrectionId).toBeNull();
    expect(result.data?.relatedFileName).toBe('Klausur_03.pdf');
    expect(result.data?.deviceContext).toBe('Safari auf iPad');
  });
});
