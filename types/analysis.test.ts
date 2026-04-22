import { describe, expect, it } from 'vitest'

import type { KlausurAnalyse } from '@/lib/openai'
import { mapToParsedAnalysis } from '@/types/analysis'

const baseAnalysis: KlausurAnalyse = {
  gesamtpunkte: 20,
  erreichtePunkte: 15,
  prozent: 75,
  zusammenfassung: 'Die Arbeit zeigt insgesamt eine solide Leistung.',
  aufgaben: [
    {
      aufgabe: '1.1: Textverständnis',
      maxPunkte: 10,
      erreichtePunkte: 8,
      kommentar:
        'DAS WAR RICHTIG:\n• Die Hauptaussage wurde erkannt.\n\nHIER GAB ES ABZÜGE:\n• Ein Beleg fehlt.\n\nVERBESSERUNGSTIPP:\n• Präziser zitieren.',
      korrekturen: ['Einen Textbeleg ergänzen.'],
    },
    {
      aufgabe: '1.2: Sprache',
      maxPunkte: 10,
      erreichtePunkte: 7,
      kommentar: 'DAS WAR RICHTIG:\n• Die Sprache war überwiegend korrekt.',
      korrekturen: [],
    },
  ],
}

describe('mapToParsedAnalysis', () => {
  it('ignores internal OCR metadata when mapping the analysis', () => {
    const withInternal: KlausurAnalyse = {
      ...baseAnalysis,
      _internal: {
        ocrText: 'Dies ist nur OCR.',
        ocrVersion: 1,
        ocrSource: 'gemini',
      },
    }

    expect(mapToParsedAnalysis(withInternal, '2')).toEqual(
      mapToParsedAnalysis(baseAnalysis, '2')
    )
  })
})
