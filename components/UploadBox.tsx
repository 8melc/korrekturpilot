'use client';

import { useRef } from 'react';

export interface UploadedFile {
  id: string;
  fileName: string;
  file?: File;
  fileKey?: string | null;
  forceReanalysis?: boolean;
}

interface UploadBoxProps {
  title: string;
  description: string;
  buttonLabel: string;
  allowMultiple?: boolean;
  onUpload: (files: UploadedFile[]) => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

export default function UploadBox({
  title,
  description,
  buttonLabel,
  allowMultiple = false,
  onUpload,
  disabled = false,
  onDisabledClick,
}: UploadBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]) => {
    const selected = Array.from(files)
      .filter((file) => file.type === 'application/pdf')
      .map((file) => ({
        id: `${file.name}-${Date.now()}`,
        fileName: file.name,
        file,
      }));

    if (selected.length === 0) {
      alert('Bitte laden Sie nur PDF-Dateien hoch.');
      return;
    }

    onUpload(selected);
  };

  const triggerDialog = () => {
    if (disabled) {
      onDisabledClick?.();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div style={{
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-lg)',
      background: 'white',
      padding: 'var(--spacing-xl)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-md)',
      minHeight: '200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <div style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-info-light)',
          color: 'var(--color-primary)',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg
            style={{ width: '24px', height: '24px' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v16M8 12l4-4 4 4" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 'var(--spacing-xs)' }}>Upload</p>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>{title}</h3>
        </div>
      </div>
      <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-600)' }}>{description}</p>
      <button
        type="button"
        className="primary-button"
        onClick={triggerDialog}
        disabled={disabled}
        style={{ marginTop: 'auto', width: '100%' }}
      >
        <span>{buttonLabel}</span>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf"
        multiple={allowMultiple}
        onChange={(event) => {
          if (event.target.files) {
            handleFiles(event.target.files);
            event.target.value = '';
          }
        }}
      />
    </div>
  );
}
