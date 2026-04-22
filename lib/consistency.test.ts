import { describe, expect, it } from 'vitest'

import {
  buildAnalysisInputHash,
  buildPromptHash,
  createAnalysisAudit,
  generateDeterministicSeed,
  hashString,
  validateAnalysisOutput,
} from '@/lib/consistency'

describe('consistency helpers', () => {
  it('uses the same analysis input hash for semantically identical text', () => {
    const base = buildAnalysisInputHash({
      klausurText: 'Aufgabe 1\r\nAntwort mit  zwei   Leerzeichen',
      erwartungshorizont: 'Aufgabe 1\nMusterlösung',
      subject: 'Englisch',
      studentName: 'Max',
      className: '7D',
      gradeLevel: '7',
      schoolYear: '2025/26',
    })

    const repeated = buildAnalysisInputHash({
      klausurText: 'Aufgabe 1\nAntwort mit zwei Leerzeichen',
      erwartungshorizont: 'Aufgabe 1\nMusterlösung',
      subject: 'Englisch',
      studentName: 'Max',
      className: '7D',
      gradeLevel: '7',
      schoolYear: '2025/26',
    })

    expect(base).toBe(repeated)
  })

  it('changes the input hash when the fachliche Grundlage changes', () => {
    const original = buildAnalysisInputHash({
      klausurText: 'Antwort A',
      erwartungshorizont: 'Musterlösung A',
      subject: 'Englisch',
    })

    const changedExpectation = buildAnalysisInputHash({
      klausurText: 'Antwort A',
      erwartungshorizont: 'Musterlösung B',
      subject: 'Englisch',
    })

    expect(original).not.toBe(changedExpectation)
  })

  it('derives the deterministic seed from stable prompt data instead of run ids', () => {
    const promptHash = buildPromptHash({
      systemPrompt: 'System',
      prompt: 'User prompt',
      model: 'gpt-4o',
      temperature: 0,
      topP: 1,
    })

    expect(generateDeterministicSeed(promptHash)).toBe(
      generateDeterministicSeed(promptHash)
    )
    expect(generateDeterministicSeed(promptHash)).not.toBe(
      generateDeterministicSeed(`${promptHash}:anderer-run`)
    )
  })

  it('creates audit metadata that keeps hashes and model params together', () => {
    const audit = createAnalysisAudit({
      analysisInputHash: hashString('input'),
      klausurTextHash: hashString('klausur'),
      erwartungshorizontHash: hashString('erwartung'),
      promptHash: hashString('prompt'),
      systemPromptHash: hashString('system'),
      seed: 1234,
      model: 'gpt-4o',
      temperature: 0,
      topP: 1,
      klausurFileHash: 'file-hash',
      erwartungshorizontFileHash: 'expectation-hash',
      sourceCorrectionId: 'corr-1',
      reusedFromCorrectionId: 'corr-0',
    })

    expect(audit.analysisInputHash).toBe(hashString('input'))
    expect(audit.model).toBe('gpt-4o')
    expect(audit.reusedFromCorrectionId).toBe('corr-0')
    expect(audit.klausurFileHash).toBe('file-hash')
  })

  it('does not reject anonymous analysis output when meta.studentName is empty', () => {
    const validation = validateAnalysisOutput({
      meta: {
        maxPoints: 10,
        achievedPoints: 7,
      },
      tasks: [
        {
          taskId: '1',
          taskTitle: 'Aufgabe 1',
          points: '7/10',
          whatIsCorrect: ['Die zentrale Aussage wurde korrekt benannt.'],
          whatIsWrong: [],
        },
      ],
      strengths: ['Die Aufgabe wurde weitgehend korrekt bearbeitet.'],
      nextSteps: ['Die Begründung kann noch präziser formuliert werden.'],
      teacherConclusion: {
        summary: 'Die Arbeit zeigt eine überwiegend sichere Bearbeitung mit kleineren Ungenauigkeiten.',
      },
    })

    expect(validation.valid).toBe(true)
    expect(validation.errors).not.toContain('Missing meta.studentName')
    expect(validation.errors).not.toContain('Missing meta.class')
  })
})
