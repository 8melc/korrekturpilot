import { describe, expect, it } from 'vitest'

import type { KlausurAnalyse } from '@/lib/openai'
import {
  getOcrInspectionState,
  mergeAnalysisInternal,
  OCR_INTERNAL_VERSION,
  stripAnalysisForLocalCache,
} from '@/lib/analysis-internal'

const baseAnalysis: KlausurAnalyse = {
  gesamtpunkte: 12,
  erreichtePunkte: 9,
  prozent: 75,
  zusammenfassung: 'Solide Leistung.',
  aufgaben: [
    {
      aufgabe: '1.1: Aufgabe',
      maxPunkte: 12,
      erreichtePunkte: 9,
      kommentar: 'DAS WAR RICHTIG:\n• Vieles ist korrekt.',
      korrekturen: [],
    },
  ],
}

describe('analysis internal helpers', () => {
  it('merges OCR metadata into the analysis payload', () => {
    const merged = mergeAnalysisInternal(baseAnalysis, undefined, {
      ocrText: 'Erkannter Text',
      ocrVersion: OCR_INTERNAL_VERSION,
      ocrSource: 'gemini',
    })

    expect(merged._internal).toEqual({
      ocrText: 'Erkannter Text',
      ocrVersion: OCR_INTERNAL_VERSION,
      ocrSource: 'gemini',
    })
  })

  it('strips sensitive OCR text from the local cache payload', () => {
    const merged = mergeAnalysisInternal(baseAnalysis, undefined, {
      ocrText: 'Sehr langer OCR Text',
      ocrVersion: OCR_INTERNAL_VERSION,
      ocrSource: 'gemini',
      extractedAt: '2026-04-22T12:00:00.000Z',
    })

    const local = stripAnalysisForLocalCache(merged)

    expect(local._internal).toEqual({
      ocrVersion: OCR_INTERNAL_VERSION,
    })
  })

  it('reports legacy, empty and available OCR inspection states', () => {
    expect(getOcrInspectionState(baseAnalysis)).toEqual({ kind: 'legacy' })

    expect(
      getOcrInspectionState(
        mergeAnalysisInternal(baseAnalysis, undefined, {
          ocrVersion: OCR_INTERNAL_VERSION,
        })
      )
    ).toEqual({ kind: 'empty' })

    expect(
      getOcrInspectionState(
        mergeAnalysisInternal(baseAnalysis, undefined, {
          ocrVersion: OCR_INTERNAL_VERSION,
          ocrText: 'Zeile 1\nZeile 2',
        })
      )
    ).toEqual({ kind: 'available', text: 'Zeile 1\nZeile 2' })
  })
})
