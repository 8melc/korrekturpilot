import { describe, expect, it } from 'vitest'

import { applyManualOverride, createManualOverrideDraft, recalculateManualOverrideDraft } from '@/lib/manual-override'
import type { KlausurAnalyse } from '@/lib/openai'

const analysis: KlausurAnalyse = {
  gesamtpunkte: 10,
  erreichtePunkte: 6,
  prozent: 60,
  zusammenfassung: 'Die Arbeit ist insgesamt solide.',
  aufgaben: [
    {
      aufgabe: '1.1: Wortschatz',
      maxPunkte: 4,
      erreichtePunkte: 2,
      kommentar:
        'DAS WAR RICHTIG:\n• Einige Begriffe waren korrekt.\n\nHIER GAB ES ABZÜGE:\n• Zwei Begriffe fehlten.\n\nVERBESSERUNGSTIPP:\n• Wiederhole die Vokabeln.',
      korrekturen: ['Begriffe vollständiger notieren.'],
    },
    {
      aufgabe: '1.2: Grammatik',
      maxPunkte: 6,
      erreichtePunkte: 4,
      kommentar:
        'DAS WAR RICHTIG:\n• Die Satzstruktur war überwiegend richtig.\n\nVERBESSERUNGSTIPP:\n• Achte auf die Verbformen.',
      korrekturen: [],
    },
  ],
}

const course = {
  subject: 'Englisch',
  gradeLevel: '7',
  className: 'D',
  schoolYear: '2025/26',
}

describe('manual override helpers', () => {
  it('recalculates totals and grade after point changes', () => {
    const draft = createManualOverrideDraft(analysis, course)
    draft.tasks[0].erreichtePunkte = 4
    draft.tasks[1].erreichtePunkte = 6

    const recalculated = recalculateManualOverrideDraft(draft, course)

    expect(recalculated.erreichtePunkte).toBe(10)
    expect(recalculated.gesamtpunkte).toBe(10)
    expect(recalculated.prozent).toBe(100)
    expect(recalculated.note).toBe('1+')
  })

  it('clamps invalid points and persists manual override metadata', () => {
    const draft = createManualOverrideDraft(analysis, course)
    draft.summary = 'Neu formulierte Gesamtbewertung.'
    draft.tasks[0].erreichtePunkte = 99
    draft.tasks[0].whatIsCorrectText = 'Der Inhalt ist korrekt.'
    draft.tasks[0].correctionsText = 'Bitte künftig vollständiger begründen.'

    const nextAnalysis = applyManualOverride(analysis, draft, course)

    expect(nextAnalysis.aufgaben[0].erreichtePunkte).toBe(4)
    expect(nextAnalysis.zusammenfassung).toBe('Neu formulierte Gesamtbewertung.')
    expect(nextAnalysis._manualOverride?.edited).toBe(true)
    expect(nextAnalysis._manualOverride?.version).toBe(1)
    expect(nextAnalysis.aufgaben[0].kommentar).toContain('DAS WAR RICHTIG:')
    expect(nextAnalysis.aufgaben[0].korrekturen).toEqual([
      'Bitte künftig vollständiger begründen.',
    ])
  })

  it('preserves internal OCR metadata when applying manual overrides', () => {
    const analysisWithInternal: KlausurAnalyse = {
      ...analysis,
      _internal: {
        ocrText: 'Erkannter OCR-Inhalt',
        ocrVersion: 1,
        ocrSource: 'gemini',
      },
    }
    const draft = createManualOverrideDraft(analysisWithInternal, course)
    draft.tasks[0].erreichtePunkte = 3

    const nextAnalysis = applyManualOverride(analysisWithInternal, draft, course)

    expect(nextAnalysis._internal).toEqual(analysisWithInternal._internal)
  })
})
