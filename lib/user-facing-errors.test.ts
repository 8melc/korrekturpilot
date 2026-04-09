import { describe, expect, it } from 'vitest'

import {
  getUserFacingErrorMessage,
  normalizeStatusError,
  readApiErrorMessage,
} from './user-facing-errors'

describe('user-facing-errors', () => {
  it('maps 401 to a session message', () => {
    expect(normalizeStatusError(401, 'Unauthorized', 'Fallback')).toBe(
      'Deine Sitzung ist abgelaufen oder ungültig. Bitte melde dich erneut an.'
    )
  })

  it('maps 402 to a credits message', () => {
    expect(normalizeStatusError(402, 'Nicht genug Credits', 'Fallback')).toBe(
      'Du hast aktuell keine Credits mehr. Bitte lade dein Konto auf und versuche es erneut.'
    )
  })

  it('maps 429 to an overload message', () => {
    expect(normalizeStatusError(429, 'rate limit exceeded', 'Fallback')).toBe(
      'OpenAI ist gerade überlastet. Bitte versuche es in ein paar Minuten erneut.'
    )
  })

  it('normalizes network errors from thrown errors', () => {
    expect(
      getUserFacingErrorMessage(new TypeError('Failed to fetch'), 'Fallback')
    ).toBe(
      'Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.'
    )
  })

  it('normalizes timeout errors from thrown errors', () => {
    expect(
      getUserFacingErrorMessage(new Error('Request timeout after 60s'), 'Fallback')
    ).toBe('Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.')
  })

  it('prefers existing user-friendly german API messages', async () => {
    const response = new Response(
      JSON.stringify({
        error:
          'Der Erwartungshorizont ist zu kurz. Bitte lade einen vollständigen Erwartungshorizont hoch.',
      }),
      { status: 400 }
    )

    await expect(readApiErrorMessage(response, 'Fallback')).resolves.toBe(
      'Der Erwartungshorizont ist zu kurz. Bitte lade einen vollständigen Erwartungshorizont hoch.'
    )
  })

  it('reads a 200 payload with error as an actual user-facing error', async () => {
    const response = new Response(
      JSON.stringify({
        error:
          'Kein Text aus PDF extrahiert. Die Datei könnte leer, beschädigt oder nicht lesbar sein.',
        text: '',
      }),
      { status: 200 }
    )

    await expect(
      readApiErrorMessage(response, 'Fallback fuer die Extraktion')
    ).resolves.toBe(
      'Die Datei ist leer, beschädigt oder nicht lesbar. Bitte lade eine andere PDF hoch.'
    )
  })
})
