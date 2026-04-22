import type { KlausurAnalyse } from '@/lib/openai'

export const OCR_INTERNAL_VERSION = 1

export interface AnalysisInternalMetadata {
  ocrText?: string
  ocrVersion?: number
  ocrSource?: string
  extractedAt?: string
}

function hasDefinedValue(value: unknown): boolean {
  return value !== undefined && value !== null
}

function compactInternalMetadata(
  metadata: AnalysisInternalMetadata
): AnalysisInternalMetadata | undefined {
  const compacted = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => hasDefinedValue(value))
  ) as AnalysisInternalMetadata

  return Object.keys(compacted).length > 0 ? compacted : undefined
}

export function mergeAnalysisInternal(
  nextAnalysis: KlausurAnalyse,
  previousAnalysis?: KlausurAnalyse | null,
  metadata?: AnalysisInternalMetadata
): KlausurAnalyse {
  const mergedInternal = compactInternalMetadata({
    ...(previousAnalysis?._internal ?? {}),
    ...(nextAnalysis._internal ?? {}),
    ...(metadata ?? {}),
  })

  if (!mergedInternal) {
    const { _internal: _ignored, ...rest } = nextAnalysis
    return rest as KlausurAnalyse
  }

  return {
    ...nextAnalysis,
    _internal: mergedInternal,
  }
}

export function stripAnalysisForLocalCache(
  analysis: KlausurAnalyse
): KlausurAnalyse {
  if (!analysis._internal) return analysis

  const { _internal, ...rest } = analysis
  const localInternal = compactInternalMetadata({
    ocrVersion: _internal.ocrVersion,
  })

  if (!localInternal) {
    return rest as KlausurAnalyse
  }

  return {
    ...rest,
    _internal: localInternal,
  } as KlausurAnalyse
}

export type OcrInspectionState =
  | { kind: 'available'; text: string }
  | { kind: 'empty' }
  | { kind: 'legacy' }

export function getOcrInspectionState(
  analysis?: KlausurAnalyse | null
): OcrInspectionState {
  const internal = analysis?._internal

  if (!internal || typeof internal.ocrVersion !== 'number') {
    return { kind: 'legacy' }
  }

  if (typeof internal.ocrText === 'string' && internal.ocrText.trim().length > 0) {
    return { kind: 'available', text: internal.ocrText }
  }

  return { kind: 'empty' }
}
