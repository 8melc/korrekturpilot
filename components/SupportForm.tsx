'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { SupportProductArea, SupportRequestInput, SupportRequestType } from '@/lib/support';

interface SupportFormProps {
  userEmail: string | null;
}

const REQUEST_TYPE_OPTIONS: Array<{ value: SupportRequestType; label: string; description: string }> = [
  { value: 'problem', label: 'Problem melden', description: 'Etwas funktioniert nicht wie erwartet.' },
  { value: 'question', label: 'Frage', description: 'Du brauchst Hilfe bei einem Schritt oder Ergebnis.' },
  { value: 'feedback', label: 'Feedback', description: 'Du möchtest Rückmeldung oder Verbesserungsvorschläge geben.' },
];

const PRODUCT_AREA_OPTIONS: Array<{ value: SupportProductArea; label: string }> = [
  { value: 'upload', label: 'Upload' },
  { value: 'analysis', label: 'Analyse' },
  { value: 'results', label: 'Ergebnisse' },
  { value: 'billing', label: 'Bezahlung' },
  { value: 'account', label: 'Konto' },
  { value: 'other', label: 'Sonstiges' },
];

const INITIAL_FORM: SupportRequestInput = {
  requestType: 'problem',
  productArea: 'analysis',
  subject: '',
  actualBehavior: '',
  expectedBehavior: '',
  reproductionSteps: '',
  relatedCorrectionId: '',
  relatedFileName: '',
  deviceContext: '',
  screenshotAvailable: false,
};

interface SubmitSuccessState {
  id: string;
}

export default function SupportForm({ userEmail }: SupportFormProps) {
  const [form, setForm] = useState<SupportRequestInput>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<SubmitSuccessState | null>(null);

  const setField = <K extends keyof SupportRequestInput>(field: K, value: SupportRequestInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(payload.error || 'Die Anfrage konnte nicht gespeichert werden.');
        return;
      }

      setSubmitSuccess({ id: payload.id });
      setForm(INITIAL_FORM);
      toast.success('Deine Anfrage wurde gespeichert.');
    } catch {
      toast.error('Die Anfrage konnte nicht gespeichert werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="module-card" style={{ padding: 'var(--spacing-xl)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Anfrage eingegangen</h2>
        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
          Deine Rückmeldung wurde gespeichert. Wir melden uns an {userEmail || 'deine Konto-E-Mail'}, in der Regel innerhalb von 24 bis 48 Stunden werktags.
        </p>
        <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-gray-700)' }}>
          Referenz-ID: <strong>{submitSuccess.id}</strong>
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setSubmitSuccess(null)}
        >
          Weitere Anfrage erfassen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="module-card" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="requestType" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Anliegen-Typ
          </label>
          <select
            id="requestType"
            value={form.requestType}
            onChange={(event) => setField('requestType', event.target.value as SupportRequestType)}
            className="support-form-input"
            disabled={isSubmitting}
          >
            {REQUEST_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', margin: 0 }}>
            {REQUEST_TYPE_OPTIONS.find((option) => option.value === form.requestType)?.description}
          </p>
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="productArea" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Produktbereich
          </label>
          <select
            id="productArea"
            value={form.productArea}
            onChange={(event) => setField('productArea', event.target.value as SupportProductArea)}
            className="support-form-input"
            disabled={isSubmitting}
          >
            {PRODUCT_AREA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="subject" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Kurze Überschrift
          </label>
          <input
            id="subject"
            type="text"
            value={form.subject}
            onChange={(event) => setField('subject', event.target.value)}
            className="support-form-input"
            placeholder="z. B. Analyse bricht nach Upload ab"
            maxLength={120}
            disabled={isSubmitting}
            required
          />
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="actualBehavior" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Was ist passiert?
          </label>
          <textarea
            id="actualBehavior"
            value={form.actualBehavior}
            onChange={(event) => setField('actualBehavior', event.target.value)}
            className="support-form-textarea"
            placeholder="Beschreibe das Problem oder deine Beobachtung so konkret wie möglich."
            maxLength={2000}
            disabled={isSubmitting}
            required
          />
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="expectedBehavior" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Was hättest du erwartet?
          </label>
          <textarea
            id="expectedBehavior"
            value={form.expectedBehavior}
            onChange={(event) => setField('expectedBehavior', event.target.value)}
            className="support-form-textarea"
            placeholder="Welches Verhalten oder Ergebnis wäre für dich korrekt gewesen?"
            maxLength={2000}
            disabled={isSubmitting}
            required
          />
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="reproductionSteps" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Schritte zum Nachvollziehen (optional)
          </label>
          <textarea
            id="reproductionSteps"
            value={form.reproductionSteps}
            onChange={(event) => setField('reproductionSteps', event.target.value)}
            className="support-form-textarea"
            placeholder="Was hast du nacheinander gemacht?"
            maxLength={2000}
            disabled={isSubmitting}
          />
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
            <label htmlFor="relatedCorrectionId" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
              Korrektur-ID (optional)
            </label>
            <input
              id="relatedCorrectionId"
              type="text"
              value={form.relatedCorrectionId}
              onChange={(event) => setField('relatedCorrectionId', event.target.value)}
              className="support-form-input"
              placeholder="z. B. Klausur_01-..."
              maxLength={120}
              disabled={isSubmitting}
            />
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
            <label htmlFor="relatedFileName" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
              Dateiname (optional)
            </label>
            <input
              id="relatedFileName"
              type="text"
              value={form.relatedFileName}
              onChange={(event) => setField('relatedFileName', event.target.value)}
              className="support-form-input"
              placeholder="z. B. Klausur_01.pdf"
              maxLength={255}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
          <label htmlFor="deviceContext" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
            Gerät / Browser (optional)
          </label>
          <input
            id="deviceContext"
            type="text"
            value={form.deviceContext}
            onChange={(event) => setField('deviceContext', event.target.value)}
            className="support-form-input"
            placeholder="z. B. Chrome auf macOS oder Safari auf iPad"
            maxLength={255}
            disabled={isSubmitting}
          />
        </div>

        <label
          htmlFor="screenshotAvailable"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-sm)',
            color: 'var(--color-gray-800)',
            lineHeight: 1.5,
          }}
        >
          <input
            id="screenshotAvailable"
            type="checkbox"
            checked={form.screenshotAvailable}
            onChange={(event) => setField('screenshotAvailable', event.target.checked)}
            disabled={isSubmitting}
            style={{ marginTop: 3, accentColor: 'var(--color-primary)' }}
          />
          <span>Ich habe bei Bedarf einen Screenshot und kann ihn bei Rückfrage nachreichen.</span>
        </label>

        <div
          style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--color-gray-50)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-gray-700)',
            lineHeight: 1.6,
          }}
        >
          Rückmeldung an: <strong>{userEmail || 'deine Konto-E-Mail'}</strong><br />
          Bitte keine sensiblen Personendaten in freie Textfelder schreiben.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Wird gespeichert…' : 'Anfrage absenden'}
          </button>
        </div>
      </div>
    </form>
  );
}
