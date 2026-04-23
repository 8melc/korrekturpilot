export const SUPPORT_REQUEST_TYPES = ['problem', 'question', 'feedback'] as const;
export const SUPPORT_PRODUCT_AREAS = ['upload', 'analysis', 'results', 'billing', 'account', 'other'] as const;
export const SUPPORT_REQUEST_STATUSES = ['new', 'reviewing', 'answered', 'closed'] as const;

export type SupportRequestType = (typeof SUPPORT_REQUEST_TYPES)[number];
export type SupportProductArea = (typeof SUPPORT_PRODUCT_AREAS)[number];
export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number];

export interface SupportRequestInput {
  requestType: SupportRequestType;
  productArea: SupportProductArea;
  subject: string;
  actualBehavior: string;
  expectedBehavior: string;
  reproductionSteps?: string;
  relatedCorrectionId?: string;
  relatedFileName?: string;
  deviceContext?: string;
  screenshotAvailable?: boolean;
}

export interface ValidatedSupportRequest {
  requestType: SupportRequestType;
  productArea: SupportProductArea;
  subject: string;
  actualBehavior: string;
  expectedBehavior: string;
  reproductionSteps: string | null;
  relatedCorrectionId: string | null;
  relatedFileName: string | null;
  deviceContext: string | null;
  screenshotAvailable: boolean;
}

export interface SupportValidationResult {
  ok: boolean;
  data?: ValidatedSupportRequest;
  error?: string;
}

const MIN_SUBJECT_LENGTH = 6;
const MIN_TEXT_LENGTH = 10;

const FIELD_LIMITS = {
  subject: 120,
  actualBehavior: 2000,
  expectedBehavior: 2000,
  reproductionSteps: 2000,
  relatedCorrectionId: 120,
  relatedFileName: 255,
  deviceContext: 255,
} as const;

function trimToLimit(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function isSupportRequestType(value: unknown): value is SupportRequestType {
  return typeof value === 'string' && SUPPORT_REQUEST_TYPES.includes(value as SupportRequestType);
}

function isSupportProductArea(value: unknown): value is SupportProductArea {
  return typeof value === 'string' && SUPPORT_PRODUCT_AREAS.includes(value as SupportProductArea);
}

export function validateSupportRequest(input: unknown): SupportValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Ungültige Anfrage.' };
  }

  const payload = input as Record<string, unknown>;

  if (!isSupportRequestType(payload.requestType)) {
    return { ok: false, error: 'Ungültiger Anliegen-Typ.' };
  }

  if (!isSupportProductArea(payload.productArea)) {
    return { ok: false, error: 'Ungültiger Produktbereich.' };
  }

  const subject = trimToLimit(payload.subject, FIELD_LIMITS.subject);
  const actualBehavior = trimToLimit(payload.actualBehavior, FIELD_LIMITS.actualBehavior);
  const expectedBehavior = trimToLimit(payload.expectedBehavior, FIELD_LIMITS.expectedBehavior);
  const reproductionSteps = trimToLimit(payload.reproductionSteps, FIELD_LIMITS.reproductionSteps);
  const relatedCorrectionId = trimToLimit(payload.relatedCorrectionId, FIELD_LIMITS.relatedCorrectionId);
  const relatedFileName = trimToLimit(payload.relatedFileName, FIELD_LIMITS.relatedFileName);
  const deviceContext = trimToLimit(payload.deviceContext, FIELD_LIMITS.deviceContext);
  const screenshotAvailable = payload.screenshotAvailable === true;

  if (subject.length < MIN_SUBJECT_LENGTH) {
    return { ok: false, error: 'Bitte gib eine kurze, aussagekräftige Überschrift an.' };
  }

  if (actualBehavior.length < MIN_TEXT_LENGTH) {
    return { ok: false, error: 'Bitte beschreibe, was passiert ist.' };
  }

  if (expectedBehavior.length < MIN_TEXT_LENGTH) {
    return { ok: false, error: 'Bitte beschreibe, was du stattdessen erwartet hast.' };
  }

  return {
    ok: true,
    data: {
      requestType: payload.requestType,
      productArea: payload.productArea,
      subject,
      actualBehavior,
      expectedBehavior,
      reproductionSteps: reproductionSteps || null,
      relatedCorrectionId: relatedCorrectionId || null,
      relatedFileName: relatedFileName || null,
      deviceContext: deviceContext || null,
      screenshotAvailable,
    },
  };
}
