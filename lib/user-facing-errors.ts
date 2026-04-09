export const DEFAULT_TIMEOUT_MESSAGE =
  'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.'
export const DEFAULT_NETWORK_MESSAGE =
  'Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.'
export const DEFAULT_AUTH_MESSAGE =
  'Deine Sitzung ist abgelaufen oder ungültig. Bitte melde dich erneut an.'
export const DEFAULT_CREDITS_MESSAGE =
  'Du hast aktuell keine Credits mehr. Bitte lade dein Konto auf und versuche es erneut.'
export const DEFAULT_ACCESS_MESSAGE =
  'Zugriff verweigert. Bitte melde dich erneut an oder lade nur deine eigenen Dateien hoch.'
export const DEFAULT_OVERLOADED_MESSAGE =
  'OpenAI ist gerade überlastet. Bitte versuche es in ein paar Minuten erneut.'
export const DEFAULT_FILE_MESSAGE =
  'Die Datei ist leer, beschädigt oder nicht lesbar. Bitte lade eine andere PDF hoch.'
export const DEFAULT_UPLOAD_MESSAGE =
  'Der Upload der Datei ist fehlgeschlagen. Bitte versuche es erneut.'
export const DEFAULT_SERVER_MESSAGE =
  'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.'

function extractPayloadMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const record = payload as Record<string, unknown>
  for (const key of ['error', 'message', 'details']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return undefined
}

function isLikelyTechnicalMessage(message: string): boolean {
  return /internal server error|failed to|http \d+|bad request|unauthorized|forbidden|network error|upload init failed/i.test(
    message
  )
}

function normalizeMessageContent(message: string, fallback: string): string {
  const trimmed = message.trim()
  if (!trimmed) return fallback

  const lower = trimmed.toLowerCase()

  if (
    lower.includes('nicht authentifiziert') ||
    lower.includes('nicht eingeloggt') ||
    lower.includes('unauthorized') ||
    lower.includes('jwt') ||
    lower.includes('token expired') ||
    lower.includes('session')
  ) {
    return DEFAULT_AUTH_MESSAGE
  }

  if (
    lower.includes('nicht genug credits') ||
    lower.includes('keine credits') ||
    lower.includes('credits mehr')
  ) {
    return DEFAULT_CREDITS_MESSAGE
  }

  if (
    lower.includes('row-level security') ||
    lower.includes('zugriff verweigert') ||
    lower.includes('forbidden')
  ) {
    return DEFAULT_ACCESS_MESSAGE
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('überlastet')
  ) {
    return DEFAULT_OVERLOADED_MESSAGE
  }

  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('abgebrochen')
  ) {
    return DEFAULT_TIMEOUT_MESSAGE
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('netzwerk') ||
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  ) {
    return DEFAULT_NETWORK_MESSAGE
  }

  if (
    lower.includes('kein text aus pdf extrahiert') ||
    lower.includes('leere datei') ||
    lower.includes('leer, beschädigt oder nicht lesbar') ||
    lower.includes('nicht lesbar') ||
    lower.includes('beschädigt')
  ) {
    return DEFAULT_FILE_MESSAGE
  }

  if (
    lower.includes('upload') &&
    (lower.includes('fehl') || lower.includes('failed') || lower.includes('signierte'))
  ) {
    return DEFAULT_UPLOAD_MESSAGE
  }

  if (isLikelyTechnicalMessage(trimmed)) return fallback

  return trimmed
}

export function normalizeStatusError(
  status: number | undefined,
  message: string,
  fallback: string
): string {
  const normalizedFallback = fallback.trim() || DEFAULT_SERVER_MESSAGE
  const normalizedMessage = normalizeMessageContent(message, normalizedFallback)

  switch (status) {
    case 401:
      return DEFAULT_AUTH_MESSAGE
    case 402:
      return DEFAULT_CREDITS_MESSAGE
    case 403:
      return DEFAULT_ACCESS_MESSAGE
    case 408:
      return DEFAULT_TIMEOUT_MESSAGE
    case 429:
      return DEFAULT_OVERLOADED_MESSAGE
    case 500:
      return normalizedMessage || DEFAULT_SERVER_MESSAGE
    default:
      return normalizedMessage || normalizedFallback
  }
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const httpStatus =
      typeof record.httpStatus === 'number'
        ? record.httpStatus
        : typeof record.status === 'number'
          ? record.status
          : undefined
    const payloadMessage = extractPayloadMessage(error)
    if (payloadMessage) {
      return normalizeStatusError(httpStatus, payloadMessage, fallback)
    }
  }

  if (error instanceof Error) {
    const extendedError = error as Error & { httpStatus?: number }
    const httpStatus =
      typeof extendedError.httpStatus === 'number'
        ? extendedError.httpStatus
        : undefined
    return normalizeStatusError(httpStatus, error.message, fallback)
  }

  if (typeof error === 'string') {
    return normalizeStatusError(undefined, error, fallback)
  }

  return fallback.trim() || DEFAULT_SERVER_MESSAGE
}

export async function readApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  let rawMessage = ''

  try {
    const text = await response.text()
    if (text.trim()) {
      try {
        rawMessage = extractPayloadMessage(JSON.parse(text)) || text.trim()
      } catch {
        rawMessage = text.trim()
      }
    }
  } catch {
    rawMessage = ''
  }

  return normalizeStatusError(response.status, rawMessage, fallback)
}
