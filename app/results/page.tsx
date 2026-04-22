'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getGradeInfo } from '@/lib/grades';
import { StoredResultEntry } from '@/types/results';
import ResultCompactView from '@/components/ResultCompactView';
import DetailDrawer from '@/components/DetailDrawer';
import FeedbackPreviewModal from '@/components/beispielauswertung/FeedbackPreviewModal';
import { useCorrections } from '@/hooks/useCorrections';
import {
  RESTART_CORRECTION_STORAGE_KEY,
  type RestartCorrectionPayload,
} from '@/lib/restart-correction';
import { readApiErrorMessage } from '@/lib/user-facing-errors';

export default function ResultsPage() {
  const { results, loading: isLoading, reload } = useCorrections();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedEntryForDrawer, setSelectedEntryForDrawer] = useState<StoredResultEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFeedbackPreview, setShowFeedbackPreview] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<StoredResultEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return results;
    const lower = searchQuery.toLowerCase();
    return results.filter((r) =>
      r.studentName?.toLowerCase().includes(lower) ||
      r.fileName?.toLowerCase().includes(lower) ||
      r.course?.subject?.toLowerCase().includes(lower)
    );
  }, [results, searchQuery]);

  const toggleResult = (id: string) => {
    setExpandedRowId((current) => (current === id ? null : id));
  };

  const handleShowDetailsDrawer = (entry: StoredResultEntry) => {
    setSelectedEntryForDrawer({
      ...entry,
      klausurFileKey: entry.fileUrl ?? entry.klausurFileKey ?? null,
      expectationFileKey: entry.expectationUrl ?? entry.expectationFileKey ?? null,
    });
    setIsDrawerOpen(true);
  };

  const handleToggleSelection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmMessage = selectedIds.size === 1
      ? 'Möchtest du diese Klausur wirklich löschen?'
      : `Möchtest du wirklich ${selectedIds.size} Klausuren löschen?`;
    
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      // Lösche alle ausgewählten Korrekturen
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch('/api/corrections', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      );

      await Promise.all(deletePromises);
      setSelectedIds(new Set());
      await reload();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen der Klausuren. Bitte versuche es erneut.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Möchtest du wirklich ALLE Klausuren löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/corrections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen');
      }

      setSelectedIds(new Set());
      await reload();
    } catch (error) {
      console.error('Fehler beim Löschen aller Klausuren:', error);
      alert('Fehler beim Löschen aller Klausuren. Bitte versuche es erneut.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Möchtest du diese Klausur wirklich löschen?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/corrections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error(
            await readApiErrorMessage(
              response,
              'Die Klausur konnte nicht gelöscht werden. Bitte versuche es erneut.'
            )
          );
        }
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await reload();
      if (selectedEntryForDrawer?.id === id) {
        setIsDrawerOpen(false);
        setSelectedEntryForDrawer(null);
      }
      toast.success('Die Klausur wurde gelöscht.');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Die Klausur konnte nicht gelöscht werden. Bitte versuche es erneut.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestartSingle = async (entry: StoredResultEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!entry.fileUrl || !entry.expectationUrl) {
      alert('Für diese Klausur fehlen die gespeicherten PDF-Dateien. Ein kompletter Neustart ist daher nicht möglich.');
      return;
    }

    if (!confirm('Die aktuelle Analyse wird verworfen und für diese Klausur komplett neu gestartet. Fortfahren?')) {
      return;
    }

    setIsDeleting(true);
    try {
      if (selectedEntryForDrawer?.id === entry.id) {
        setIsDrawerOpen(false);
        setSelectedEntryForDrawer(null);
      }

      const response = await fetch('/api/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          status: 'Analyse läuft…',
          analysis: null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(
            response,
            'Die Klausur konnte nicht neu gestartet werden. Bitte versuche es erneut.'
          )
        );
      }

      const restartPayload: RestartCorrectionPayload = {
        id: entry.id,
        fileName: entry.fileName,
        fileKey: entry.fileUrl,
        expectationKey: entry.expectationUrl,
        expectationFileName: entry.expectationUrl.split('/').pop() ?? null,
        course: entry.course,
      };

      localStorage.setItem(
        RESTART_CORRECTION_STORAGE_KEY,
        JSON.stringify(restartPayload)
      );

      toast.info('Die Klausur wird im Korrektur-Flow komplett neu gestartet.')
      window.location.href = '/correction?restart=1'
    } catch (error) {
      console.error('Fehler beim Neustarten der Klausur:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Die Klausur konnte nicht neu gestartet werden. Bitte versuche es erneut.'
      );
      setIsDeleting(false);
    }
  };

  const handleEntrySaved = async (updatedEntry: StoredResultEntry) => {
    setSelectedEntryForDrawer(updatedEntry);
    await reload();
  };

  return (
    <ProtectedRoute>
      <section className="results-section">
        <div className="container">
          <div className="results-header">
            <div>
              <h1 className="results-title">Alle Klausuren</h1>
              <p className="results-subtitle">
                Hier findest du alle korrigierten Arbeiten und Analysen im Überblick.
              </p>
            </div>
            <div className="results-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {/* Löschen-Funktionen vorerst deaktiviert
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="secondary-button"
                  style={{ backgroundColor: 'var(--color-error, #ef4444)', color: 'white' }}
                >
                  {isDeleting ? 'Löschen...' : `Ausgewählte löschen (${selectedIds.size})`}
                </button>
              )}
              {filteredResults.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="secondary-button"
                  style={{ backgroundColor: 'var(--color-error, #ef4444)', color: 'white' }}
                >
                  {isDeleting ? 'Löschen...' : 'Alle löschen'}
                </button>
              )}
              */}
              <button onClick={() => reload()} className="secondary-button" disabled={isDeleting}>
                Aktualisieren
              </button>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--color-gray-500)' }}>
              Lade Ergebnisse...
            </div>
          ) : filteredResults.length > 0 ? (
            <>
              <div className="results-table-card results-table-wrapper">
                <div className="filter-row">
                  <input
                    type="text"
                    placeholder="Suche nach Name, Fach oder Datei..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--radius-lg)',
                      outline: 'none',
                      minHeight: '48px',
                    }}
                  />
                </div>
                <div className="table-container">
                  <table className="results-table" style={{ minWidth: '720px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={filteredResults.length > 0 && selectedIds.size === filteredResults.length}
                            onChange={handleSelectAll}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </th>
                        <th>Dateiname</th>
                        <th>Fach</th>
                        <th>Jahrgang</th>
                        <th>Klasse / Kurs</th>
                        <th>Punkte</th>
                        <th>Note</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((entry) => {
                        const analysis = entry.analysis;
                        const percentage = analysis?.prozent ?? 0;
                        const gradeLevel = entry.course.gradeLevel
                          ? parseInt(entry.course.gradeLevel, 10) || 10
                          : 10;
                        const gradeInfo = analysis
                          ? getGradeInfo({ prozent: percentage, gradeLevel })
                          : null;

                        return (
                          <React.Fragment key={entry.id}>
                            <tr
                              className="table-row-clickable"
                              onClick={() => {
                                setSelectedEntryForDrawer({
                                  ...entry,
                                  klausurFileKey: entry.fileUrl ?? entry.klausurFileKey ?? null,
                                  expectationFileKey: entry.expectationUrl ?? entry.expectationFileKey ?? null,
                                });
                                setIsDrawerOpen(true);
                              }}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(entry.id)}
                                  onChange={() => handleToggleSelection(entry.id)}
                                />
                              </td>
                              <td>
                                <div className="student-cell">
                                  <div className="student-avatar">
                                    {(entry.fileName || entry.studentName).charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span className="student-name">{entry.fileName || entry.studentName}</span>
                                    {entry.analysis?._manualOverride?.edited && (
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                        Manuell bearbeitet
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>{entry.course.subject}</td>
                              <td>{entry.course.gradeLevel || '–'}</td>
                              <td>{entry.course.className || '–'}</td>
                              <td>
                                {analysis ? (
                                  <span className="points-display">
                                    {analysis.erreichtePunkte} / {analysis.gesamtpunkte}
                                  </span>
                                ) : (
                                  '–'
                                )}
                              </td>
                              <td>
                                {gradeInfo ? (
                                  <span className={`grade-badge ${gradeInfo.badgeClass}`}>
                                    {gradeInfo.label}
                                  </span>
                                ) : (
                                  '–'
                                )}
                              </td>
                              <td>
                                <div className="action-buttons" style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                  {analysis && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleResult(entry.id);
                                      }}
                                      className="secondary-button"
                                    >
                                      {expandedRowId === entry.id ? 'Details ausblenden' : 'Details anzeigen'}
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteSingle(entry.id, e)}
                                    disabled={isDeleting}
                                    className="secondary-button"
                                    style={{ backgroundColor: 'var(--color-error, #ef4444)', color: 'white' }}
                                  >
                                    Löschen
                                  </button>
                                  {analysis && (
                                    <button
                                      onClick={(e) => handleRestartSingle(entry, e)}
                                      disabled={isDeleting}
                                      className="secondary-button"
                                    >
                                      Komplett neu starten
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {expandedRowId === entry.id && (
                              <tr className="results-detail-row">
                                <td colSpan={8} className="p-0">
                                  <div className="bg-white border-t border-gray-200">
                                    <article className={`results-accordion-item results-accordion-item--open`}>
                                      <div className="results-accordion-content">
                                        {entry.analysis ? (
                                          <ResultCompactView
                                            entry={entry}
                                            onShowDetails={() => handleShowDetailsDrawer(entry)}
                                          />
                                        ) : (
                                          <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', marginBottom: 'var(--spacing-md)' }}>
                                            Die Analyse läuft noch. Sobald sie abgeschlossen ist, erscheint hier die Detailauswertung.
                                          </div>
                                        )}
                                      </div>
                                    </article>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="results-cards-mobile">
                <div className="filter-row">
                  <input
                    type="text"
                    placeholder="Suche nach Name, Fach oder Datei..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--radius-lg)',
                      outline: 'none',
                      minHeight: '48px',
                      background: 'white',
                    }}
                  />
                </div>

                {filteredResults.map((entry) => {
                  const analysis = entry.analysis;
                  const percentage = analysis?.prozent ?? 0;
                  const gradeLevel = entry.course.gradeLevel
                    ? parseInt(entry.course.gradeLevel, 10) || 10
                    : 10;
                  const gradeInfo = analysis
                    ? getGradeInfo({ prozent: percentage, gradeLevel })
                    : null;

                  return (
                    <div className="results-card" key={entry.id}>
                      <div className="results-card__row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => handleToggleSelection(entry.id)}
                          />
                            <div className="student-cell">
                              <div className="student-avatar">
                                {(entry.fileName || entry.studentName).charAt(0).toUpperCase()}
                              </div>
                              <div className="results-card__meta">
                                <p className="student-name">{entry.fileName || entry.studentName}</p>
                                <p className="results-card__sub">{entry.course.subject}</p>
                                {entry.analysis?._manualOverride?.edited && (
                                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                    Manuell bearbeitet
                                  </p>
                                )}
                              </div>
                            </div>
                        </div>
                        {gradeInfo && (
                          <span className={`grade-badge ${gradeInfo.badgeClass}`}>
                            {gradeInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="results-card__row results-card__details">
                        <div>
                          <p className="results-card__label">Jahrgang</p>
                          <p className="results-card__value">{entry.course.gradeLevel || '–'}</p>
                        </div>
                        <div>
                          <p className="results-card__label">Klasse / Kurs</p>
                          <p className="results-card__value">{entry.course.className || '–'}</p>
                        </div>
                        <div>
                          <p className="results-card__label">Punkte</p>
                          <p className="results-card__value">
                            {analysis ? `${analysis.erreichtePunkte} / ${analysis.gesamtpunkte}` : '–'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column' }}>
                        {analysis && (
                          <>
                            <button
                              type="button"
                              className="primary-button results-card__action"
                              onClick={() => {
                                setExpandedRowId(expandedRowId === entry.id ? null : entry.id);
                              }}
                            >
                              {expandedRowId === entry.id ? 'Details ausblenden' : 'Details anzeigen'}
                            </button>
                            {expandedRowId === entry.id && (
                              <div className="results-card__expand">
                                <article className={`results-accordion-item results-accordion-item--open`}>
                                  <div className="results-accordion-content">
                                    {entry.analysis ? (
                                      <ResultCompactView
                                        entry={entry}
                                        onShowDetails={() => handleShowDetailsDrawer(entry)}
                                      />
                                    ) : (
                                      <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', marginBottom: 'var(--spacing-md)' }}>
                                        Die Analyse läuft noch. Sobald sie abgeschlossen ist, erscheint hier die Detailauswertung.
                                      </div>
                                    )}
                                  </div>
                                </article>
                              </div>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingle(entry.id, e)}
                          disabled={isDeleting}
                          className="secondary-button"
                          style={{ backgroundColor: 'var(--color-error, #ef4444)', color: 'white' }}
                        >
                          {isDeleting ? 'Löschen...' : 'Löschen'}
                        </button>
                        {analysis && (
                          <button
                            type="button"
                            onClick={(e) => handleRestartSingle(entry, e)}
                            disabled={isDeleting}
                            className="secondary-button"
                          >
                            Komplett neu starten
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="results-empty-card">
              <h3>Keine Ergebnisse gefunden</h3>
              <p>
                Es wurden keine Klausuren gefunden, die deiner Suche entsprechen.
              </p>
            </div>
          )}

          {/* DataResetButton vorerst deaktiviert
          <DataResetButton />
          */}

          <DetailDrawer
            entry={selectedEntryForDrawer}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onSaved={handleEntrySaved}
          />

          <FeedbackPreviewModal
            isOpen={showFeedbackPreview}
            onClose={() => setShowFeedbackPreview(false)}
            entry={previewEntry}
            mode="results"
          />
        </div>
      </section>
    </ProtectedRoute>
  );
}
