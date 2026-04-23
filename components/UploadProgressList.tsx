'use client';

import { useEffect, useState } from 'react';
import type { QueueItem } from '@/hooks/useUploadQueue';

type UploadStatus = QueueItem['status'];

interface UploadProgressListProps {
  items: QueueItem[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

type StageKey = 'upload' | 'extraction' | 'analysis' | 'done';

type StageState = 'inactive' | 'active' | 'done' | 'error';

interface StageDef {
  key: StageKey;
  label: string;
  color: string;
}

const STAGES: StageDef[] = [
  { key: 'upload', label: 'Upload', color: 'var(--color-primary)' },
  { key: 'extraction', label: 'Extraktion', color: '#8b5cf6' }, // violett, passt zum Scheme
  { key: 'analysis', label: 'Analyse', color: 'var(--color-warning)' },
  { key: 'done', label: 'Fertig', color: 'var(--color-success)' },
];

function getStageStates(status: UploadStatus): Record<StageKey, StageState> {
  // Reihenfolge: pending -> uploading -> extracting -> analyzing -> completed
  switch (status) {
    case 'pending':
      return { upload: 'inactive', extraction: 'inactive', analysis: 'inactive', done: 'inactive' };
    case 'uploading':
      return { upload: 'active', extraction: 'inactive', analysis: 'inactive', done: 'inactive' };
    case 'extracting':
      return { upload: 'done', extraction: 'active', analysis: 'inactive', done: 'inactive' };
    case 'analyzing':
      return { upload: 'done', extraction: 'done', analysis: 'active', done: 'inactive' };
    case 'completed':
      return { upload: 'done', extraction: 'done', analysis: 'done', done: 'done' };
    case 'error':
    case 'errorfinal':
      // Markiere die zuletzt aktive Stage als Fehler (heuristisch: analysis, wenn nichts klar ist)
      return { upload: 'done', extraction: 'done', analysis: 'error', done: 'inactive' };
  }
}

function getPhaseText(status: UploadStatus): string {
  switch (status) {
    case 'pending':
      return 'Wartet auf Start';
    case 'uploading':
      return 'Datei wird hochgeladen';
    case 'extracting':
      return 'Texterkennung läuft';
    case 'analyzing':
      return 'KI analysiert die Klausur';
    case 'completed':
      return 'Fertig';
    case 'error':
      return 'Fehler (wird ggf. erneut versucht)';
    case 'errorfinal':
      return 'Fehler (endgültig)';
  }
}

function formatSeconds(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m} min ${r.toString().padStart(2, '0')} s`;
}

/** Eigener Hook: tickt alle 500 ms, damit der Counter animiert.
 *  Wird einmal oben gerendert und per props weitergereicht, um
 *  nicht für jede Zeile einen eigenen Interval zu bauen. */
function useNow(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

export default function UploadProgressList({
  items,
  onRetry,
  onRemove,
}: UploadProgressListProps) {
  // Nur ticken, wenn mindestens ein Item aktiv ist — spart Renders, wenn alles fertig
  const hasActive = items.some(
    (it) => it.status === 'uploading' || it.status === 'extracting' || it.status === 'analyzing',
  );
  const now = useNow(500, hasActive);

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {items.map((item) => {
        const stageStates = getStageStates(item.status);
        const isIndeterminate = item.status === 'extracting' || item.status === 'analyzing';
        const isError = item.status === 'error' || item.status === 'errorfinal';

        // Elapsed-Berechnung
        let elapsedMs = 0;
        let elapsedLabel = '';
        if (item.status === 'completed' && item.createdAt) {
          elapsedMs = now - item.createdAt;
          elapsedLabel = `${formatSeconds(elapsedMs)} Gesamt`;
        } else if (item.phaseStartedAt) {
          elapsedMs = now - item.phaseStartedAt;
          elapsedLabel = formatSeconds(elapsedMs);
        }

        const progressBarColor = isError
          ? 'var(--color-error)'
          : item.status === 'completed'
          ? 'var(--color-success)'
          : item.status === 'extracting'
          ? '#8b5cf6'
          : item.status === 'analyzing'
          ? 'var(--color-warning)'
          : 'var(--color-primary)';

        return (
          <div
            key={item.id}
            style={{
              padding: 'var(--spacing-md)',
              background: 'var(--color-gray-50)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Kopfzeile: Dateiname + Aktionen */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-sm)',
                gap: 'var(--spacing-sm)',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <svg
                  style={{ width: '18px', height: '18px', color: 'var(--color-gray-500)', flexShrink: 0 }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <path d="M15 2v6h6" />
                </svg>
                <span
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'var(--color-gray-900)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.fileName}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                {isError && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    className="secondary-button"
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Erneut versuchen
                  </button>
                )}

                {(item.status === 'pending' || isError) && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="secondary-button"
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>

            {/* Stage-Pills */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-xs)',
                flexWrap: 'wrap',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              {STAGES.map((stage) => {
                const state = stageStates[stage.key];
                const isActive = state === 'active';
                const isDone = state === 'done';
                const isErr = state === 'error';

                const bg = isDone
                  ? 'var(--color-success)'
                  : isActive
                  ? stage.color
                  : isErr
                  ? 'var(--color-error)'
                  : 'white';

                const color = isDone || isActive || isErr ? 'white' : 'var(--color-gray-500)';
                const border = isDone || isActive || isErr ? bg : 'var(--color-gray-300)';

                return (
                  <div
                    key={stage.key}
                    className={isActive ? 'upload-pill-active' : undefined}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '9999px',
                      background: bg,
                      color,
                      border: `1px solid ${border}`,
                      whiteSpace: 'nowrap',
                      transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
                    }}
                    aria-label={`${stage.label}: ${state}`}
                  >
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    {isErr && (
                      <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path
                          d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 5a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0V7zm1 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    {stage.label}
                  </div>
                );
              })}
            </div>

            {/* Fortschrittsbalken — nur ab uploading sichtbar */}
            {item.status !== 'pending' && (
              <div style={{ marginTop: 'var(--spacing-xs)' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '8px',
                    background: 'var(--color-gray-200)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: `${Math.round(item.progress)}%`,
                      height: '100%',
                      background: progressBarColor,
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease, background 0.3s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {isIndeterminate && (
                      <div
                        className="upload-bar-shimmer"
                        style={{ position: 'absolute', inset: 0 }}
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Statuszeile: Phase + Elapsed */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                marginTop: 'var(--spacing-xs)',
                fontSize: '0.8125rem',
                color: isError ? 'var(--color-error-dark)' : 'var(--color-gray-700)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontWeight: 500 }}>
                {getPhaseText(item.status)}
                {elapsedLabel && ` · ${elapsedLabel}`}
              </span>
              {item.status !== 'pending' && (
                <span style={{ color: 'var(--color-gray-500)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(item.progress)}%
                </span>
              )}
            </div>

            {/* Fehlermeldung */}
            {isError && item.error && (
              <div
                style={{
                  marginTop: 'var(--spacing-sm)',
                  padding: 'var(--spacing-sm)',
                  background: 'var(--color-error-light)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-error-dark)',
                }}
              >
                {item.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
