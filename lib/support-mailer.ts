import nodemailer from 'nodemailer';
import type { SupportRequestType, SupportProductArea, ValidatedSupportRequest } from '@/lib/support';

interface SupportNotificationParams {
  requestId: string;
  userId: string;
  userEmail: string | null;
  payload: ValidatedSupportRequest;
}

const REQUEST_TYPE_LABELS: Record<SupportRequestType, string> = {
  problem: 'Problem',
  question: 'Frage',
  feedback: 'Feedback',
};

const PRODUCT_AREA_LABELS: Record<SupportProductArea, string> = {
  upload: 'Upload',
  analysis: 'Analyse',
  results: 'Ergebnisse',
  billing: 'Bezahlung',
  account: 'Konto',
  other: 'Sonstiges',
};

function getMailerConfig() {
  const host = process.env.SUPPORT_SMTP_HOST;
  const port = Number(process.env.SUPPORT_SMTP_PORT || '587');
  const user = process.env.SUPPORT_SMTP_USER;
  const pass = process.env.SUPPORT_SMTP_PASS;
  const from = process.env.SUPPORT_FROM_EMAIL || process.env.SUPPORT_SMTP_USER;
  const to = process.env.SUPPORT_TO_EMAIL || 'kontakt@korrekturpilot.de';
  const secure = process.env.SUPPORT_SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass || !from || !to || Number.isNaN(port)) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
    to,
  };
}

function buildText({ requestId, userId, userEmail, payload }: SupportNotificationParams) {
  return [
    `Neue Support-Anfrage (${requestId})`,
    '',
    `Anliegen-Typ: ${REQUEST_TYPE_LABELS[payload.requestType]}`,
    `Produktbereich: ${PRODUCT_AREA_LABELS[payload.productArea]}`,
    `Betreff: ${payload.subject}`,
    `Konto-E-Mail: ${userEmail || 'nicht verfügbar'}`,
    `User-ID: ${userId}`,
    '',
    'Was ist passiert?',
    payload.actualBehavior,
    '',
    'Was wurde erwartet?',
    payload.expectedBehavior,
    '',
    `Schritte zum Nachvollziehen: ${payload.reproductionSteps || 'keine Angabe'}`,
    `Korrektur-ID: ${payload.relatedCorrectionId || 'keine Angabe'}`,
    `Dateiname: ${payload.relatedFileName || 'keine Angabe'}`,
    `Gerät / Browser: ${payload.deviceContext || 'keine Angabe'}`,
    `Screenshot vorhanden: ${payload.screenshotAvailable ? 'ja' : 'nein'}`,
  ].join('\n');
}

function renderOptionalRow(label: string, value: string | null | undefined) {
  return `<tr><td style="padding:8px 0;font-weight:600;color:#334155;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#0f172a;">${escapeHtml(value || 'keine Angabe')}</td></tr>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildHtml({ requestId, userId, userEmail, payload }: SupportNotificationParams) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:#dbeafe;border-bottom:1px solid #bfdbfe;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8;">KorrekturPilot Support</p>
          <h1 style="margin:0;font-size:22px;line-height:1.3;">Neue Support-Anfrage</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Es wurde eine neue strukturierte Support-Anfrage über das Produkt erfasst.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${renderOptionalRow('Referenz-ID', requestId)}
            ${renderOptionalRow('Anliegen-Typ', REQUEST_TYPE_LABELS[payload.requestType])}
            ${renderOptionalRow('Produktbereich', PRODUCT_AREA_LABELS[payload.productArea])}
            ${renderOptionalRow('Betreff', payload.subject)}
            ${renderOptionalRow('Konto-E-Mail', userEmail)}
            ${renderOptionalRow('User-ID', userId)}
            ${renderOptionalRow('Korrektur-ID', payload.relatedCorrectionId)}
            ${renderOptionalRow('Dateiname', payload.relatedFileName)}
            ${renderOptionalRow('Gerät / Browser', payload.deviceContext)}
            ${renderOptionalRow('Screenshot vorhanden', payload.screenshotAvailable ? 'ja' : 'nein')}
          </table>
          <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 8px;font-size:16px;">Was ist passiert?</h2>
            <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#334155;">${escapeHtml(payload.actualBehavior)}</p>
          </div>
          <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 8px;font-size:16px;">Was wurde erwartet?</h2>
            <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#334155;">${escapeHtml(payload.expectedBehavior)}</p>
          </div>
          <div>
            <h2 style="margin:0 0 8px;font-size:16px;">Schritte zum Nachvollziehen</h2>
            <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#334155;">${escapeHtml(payload.reproductionSteps || 'keine Angabe')}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function sendSupportNotification(params: SupportNotificationParams) {
  const config = getMailerConfig();

  if (!config) {
    console.warn('Support mailer not configured. Skipping support notification email.');
    return { delivered: false, reason: 'not_configured' as const };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to: config.to,
    replyTo: params.userEmail || undefined,
    subject: `[Support] ${REQUEST_TYPE_LABELS[params.payload.requestType]} · ${params.payload.subject}`,
    text: buildText(params),
    html: buildHtml(params),
  });

  return { delivered: true as const };
}
