'use client';

import type { QueueItem } from '@/hooks/useUploadQueue';

type UploadStatus = QueueItem['status'];

interface UploadProgressListProps {
  items: QueueItem[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

function getStatusLabel(status: UploadStatus): string {
  switch (status) {
    case 'pending':
      return 'Wartet...';
    case 'uploading':
      return 'Wird hochgeladen...';
    case 'extracting':
      return 'Extrahiert Text...';
    case 'analyzing':
      return 'Wird analysiert...';
    case 'completed':
      return 'Fertig';
    case 'error':
      return 'Fehler (wird ggf. erneut versucht)';
    case 'errorfinal':
      return 'Fehler (endgültig)';
    default:
      return '';
  }
}

function getStatusColor(status: UploadStatus): string {
  switch (status) {
    case 'pending':
      return 'var(--color-gray-500)';
    case 'uploading':
    case 'extracting':
    case 'analyzing':
      return 'var(--color-primary)';
    case 'completed':
      return 'var(--color-success)';
    case 'error':
    case 'errorfinal':
      return 'var(--color-error)';
    default:
      return 'var(--color-gray-500)';
  }
}

export default function UploadProgressList({
  items,
  onRetry,
  onRemove,
}: UploadProgressListProps) {
  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-gray-50)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {/* Kopfzeile: Dateiname + Status + Buttons */}
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
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: getStatusColor(item.status),
                  whiteSpace: 'nowrap',
                }}
              >
                {getStatusLabel(item.status)}
              </span>

              {(item.status === 'error' || item.status === 'errorfinal') && (
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

              {item.status === 'pending' || item.status === 'error' || item.status === 'errorfinal' ? (
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
              ) : null}
            </div>
          </div>

          {/* Fortschrittsbalken */}
          {item.status !== 'pending' && (
            <>
              <div style={{ marginTop: 'var(--spacing-xs)' }}>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'var(--color-gray-200)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(item.progress)}%`,
                      height: '100%',
                      background: getStatusColor(item.status),
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 'var(--spacing-xs)',
                  fontSize: '0.75rem',
                  color: 'var(--color-gray-600)',
                }}
              >
                <span>{Math.round(item.progress)}%</span>
                <span>
                  {item.status === 'uploading' && 'Upload'}
                  {item.status === 'extracting' && 'Extraktion'}
                  {item.status === 'analyzing' && 'Analyse'}
                  {item.status === 'completed' && 'Abgeschlossen'}
                  {(item.status === 'error' || item.status === 'errorfinal') && 'Fehler'}
                </span>
              </div>
            </>
          )}

          {/* Fehlermeldung */}
          {(item.status === 'error' || item.status === 'errorfinal') && item.error && (
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
      ))}
    </div>
  );
}





