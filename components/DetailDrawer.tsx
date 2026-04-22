'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { KlausurAnalyse } from '@/lib/openai';
import type { StoredResultEntry } from '@/types/results';
import { mapToParsedAnalysis } from '@/types/analysis';
import { renderTeacherResultSection, type TeacherTaskView } from '@/lib/renderers/teacher-renderer';
import { getPublicPdfUrl } from '@/lib/supabase/storage';
import { cleanAndFormatText } from '@/lib/text-formatter';
import {
  applyManualOverride,
  createManualOverrideDraft,
  recalculateManualOverrideDraft,
  type ManualOverrideDraft,
  type ManualOverrideTaskDraft,
} from '@/lib/manual-override';
import { getOcrInspectionState } from '@/lib/analysis-internal';

interface DetailDrawerProps {
  entry: StoredResultEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (entry: StoredResultEntry) => Promise<void> | void;
  isDemo?: boolean;
}

interface TaskAccordionProps {
  task: TeacherTaskView;
}

interface EditableTaskCardProps {
  task: ManualOverrideTaskDraft;
  index: number;
  onChange: (index: number, patch: Partial<ManualOverrideTaskDraft>) => void;
}

function TaskAccordion({ task }: TaskAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const whatWasGood = (task.correctAspects || []).map(cleanAndFormatText);
  const whatToImprove = (task.deductions || []).map(cleanAndFormatText);
  const tipsForYou = (task.improvementHints || []).map(cleanAndFormatText);
  const corrections = (task.corrections || []).map(cleanAndFormatText);
  const hasStructure =
    whatWasGood.length > 0 ||
    whatToImprove.length > 0 ||
    tipsForYou.length > 0 ||
    corrections.length > 0;

  const pointsParts = task.points.split('/').map((p) => parseInt(p.trim(), 10));
  const pointsScored = pointsParts[0] || 0;
  const pointsMax = pointsParts[1] || 0;

  return (
    <div className="drawer-accordion" style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="drawer-accordion-trigger"
      >
        <span className="drawer-accordion-title" style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
          {task.taskTitle}
        </span>
        <span className="drawer-accordion-points" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>
          {pointsScored} / {pointsMax} Punkte
        </span>
        <svg
          style={{ width: '20px', height: '20px', color: 'var(--color-gray-500)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="drawer-accordion-content" style={{ background: 'white' }}>
          {hasStructure ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {whatWasGood.length > 0 && (
                <div className="drawer-note-box" style={{ background: 'white', border: 'none', borderLeft: '4px solid #10b981', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>Was war gut</span>
                  <ul style={{ color: 'var(--color-gray-900)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'var(--spacing-sm)' }}>
                    {whatWasGood.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {whatToImprove.length > 0 && (
                <div className="drawer-note-box" style={{ background: 'white', border: 'none', borderLeft: '4px solid #ef4444', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <span style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>Verbesserungsbedarf</span>
                  <ul style={{ color: 'var(--color-gray-900)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'var(--spacing-sm)' }}>
                    {whatToImprove.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {tipsForYou.length > 0 && (
                <div className="drawer-note-box" style={{ background: '#f9fafb', border: 'none', borderLeft: '4px solid #3b82f6', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.875rem', fontWeight: 600 }}>Tipp</span>
                  <ul style={{ color: 'var(--color-gray-900)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'var(--spacing-sm)' }}>
                    {tipsForYou.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {corrections.length > 0 && (
                <div className="drawer-note-box" style={{ background: '#f9fafb', border: 'none', borderLeft: '4px solid #f59e0b', borderRadius: '0.5rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>Korrekturen</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>
                    {corrections.map((korrektur, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                        <span style={{ marginTop: '6px', display: 'inline-block', height: '8px', width: '8px', borderRadius: '50%', background: '#f59e0b' }} aria-hidden="true"></span>
                        <span>{korrektur}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="drawer-note-box" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ color: 'var(--color-gray-700)', fontSize: '0.875rem' }}>Keine Bewertung vorhanden.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableTaskCard({ task, index, onChange }: EditableTaskCardProps) {
  return (
    <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-lg)', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.25rem' }}>
            Aufgabe
          </label>
          <input
            type="text"
            value={task.taskTitle}
            onChange={(event) => onChange(index, { taskTitle: event.target.value })}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.25rem' }}>
              Erreichte Punkte
            </label>
            <input
              type="number"
              min={0}
              max={task.maxPunkte}
              step={1}
              value={task.erreichtePunkte}
              onChange={(event) =>
                onChange(index, { erreichtePunkte: Number.parseInt(event.target.value, 10) || 0 })
              }
              style={{ width: '110px', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)' }}
            />
          </div>
          <div style={{ paddingBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>
            / {task.maxPunkte}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981' }}>Was war gut</span>
          <textarea
            value={task.whatIsCorrectText}
            onChange={(event) => onChange(index, { whatIsCorrectText: event.target.value })}
            rows={4}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)', resize: 'vertical' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ef4444' }}>Verbesserungsbedarf</span>
          <textarea
            value={task.whatIsWrongText}
            onChange={(event) => onChange(index, { whatIsWrongText: event.target.value })}
            rows={4}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)', resize: 'vertical' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3b82f6' }}>Tipp</span>
          <textarea
            value={task.improvementTipsText}
            onChange={(event) => onChange(index, { improvementTipsText: event.target.value })}
            rows={3}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)', resize: 'vertical' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f59e0b' }}>Korrekturen</span>
          <textarea
            value={task.correctionsText}
            onChange={(event) => onChange(index, { correctionsText: event.target.value })}
            rows={3}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)', resize: 'vertical' }}
          />
        </label>
      </div>
    </div>
  );
}

export default function DetailDrawer({ entry, isOpen, onClose, onSaved, isDemo = false }: DetailDrawerProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [teacherView, setTeacherView] = useState<ReturnType<typeof renderTeacherResultSection> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'klausur' | 'erwartung' | 'analyse'>('analyse');
  const [localAnalysis, setLocalAnalysis] = useState<KlausurAnalyse | null>(null);
  const [draft, setDraft] = useState<ManualOverrideDraft | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(96);

  const activeAnalysis = localAnalysis ?? entry?.analysis ?? null;
  const gradeLevel = entry?.course?.gradeLevel ? parseInt(entry.course.gradeLevel, 10) || 10 : 10;

  useEffect(() => {
    if (entry?.analysis) {
      setLocalAnalysis(entry.analysis);
      setDraft(createManualOverrideDraft(entry.analysis, entry.course));
    } else {
      setLocalAnalysis(null);
      setDraft(null);
    }
    setIsEditMode(false);
  }, [entry]);

  useEffect(() => {
    if (isOpen && entry && activeAnalysis) {
      setIsLoading(true);
      try {
        const parsed = mapToParsedAnalysis(activeAnalysis, '');
        const view = renderTeacherResultSection(parsed, gradeLevel);
        setTeacherView(view);
      } catch (error) {
        console.error('Fehler beim Laden der Lehrer-Ansicht:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setTeacherView(null);
      setIsLoading(false);
    }
  }, [isOpen, entry, activeAnalysis, gradeLevel]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      document.body.style.overflow = '';
      setIsAnimating(false);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const updateHeaderOffset = () => {
      const header = document.querySelector('.header');
      if (!(header instanceof HTMLElement)) {
        setHeaderOffset(96);
        return;
      }

      const nextOffset = Math.ceil(header.getBoundingClientRect().height) + 12;
      setHeaderOffset(nextOffset);
    };

    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset);

    return () => {
      window.removeEventListener('resize', updateHeaderOffset);
    };
  }, [isOpen]);

  const displayTasks = teacherView?.tasks || [];
  const klausurUrl = getPublicPdfUrl(entry?.klausurFileKey);
  const expectationUrl = getPublicPdfUrl(entry?.expectationFileKey);
  const ocrInspection = getOcrInspectionState(activeAnalysis);

  const overview = useMemo(() => {
    if (isEditMode && draft) {
      return {
        points: `${draft.erreichtePunkte}/${draft.gesamtpunkte}`,
        percentage: draft.prozent,
        note: draft.note,
        summary: draft.summary,
      };
    }

    return {
      points: teacherView?.overall.points || '–',
      percentage: teacherView?.overall.percentage ?? 0,
      note: teacherView?.overall.note || '–',
      summary: teacherView?.summary.overallSummary || activeAnalysis?.zusammenfassung || '',
    };
  }, [activeAnalysis, draft, isEditMode, teacherView]);

  const drawerTop = `${headerOffset}px`;
  const drawerHeight = `calc(100dvh - ${headerOffset}px)`;

  if (!isOpen || !entry || !activeAnalysis) return null;

  const openInNewTab = (url?: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTaskDraftChange = (index: number, patch: Partial<ManualOverrideTaskDraft>) => {
    setDraft((current) => {
      if (!current) return current;
      const tasks = current.tasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, ...patch } : task
      );
      return recalculateManualOverrideDraft({ ...current, tasks }, entry.course);
    });
  };

  const handleSummaryChange = (value: string) => {
    setDraft((current) => (current ? { ...current, summary: value } : current));
  };

  const handleCancelEditing = () => {
    setDraft(createManualOverrideDraft(activeAnalysis, entry.course));
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!draft) return;

    setIsSaving(true);
    try {
      const nextAnalysis = applyManualOverride(activeAnalysis, draft, entry.course);
      const response = await fetch('/api/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          analysis: nextAnalysis,
          status: 'Bereit',
        }),
      });

      if (!response.ok) {
        throw new Error('Die Änderungen konnten nicht gespeichert werden.');
      }

      const updatedEntry: StoredResultEntry = {
        ...entry,
        analysis: nextAnalysis,
      };

      setLocalAnalysis(nextAnalysis);
      setDraft(createManualOverrideDraft(nextAnalysis, entry.course));
      setIsEditMode(false);
      toast.success('Die manuellen Änderungen wurden gespeichert.')
      await onSaved?.(updatedEntry);
    } catch (error) {
      console.error('Fehler beim Speichern des Manual Override:', error);
      toast.error('Die Änderungen konnten nicht gespeichert werden.')
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: drawerTop,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          transition: 'opacity 0.3s',
          opacity: isAnimating ? 1 : 0,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="detail-drawer-panel"
        style={{
          position: 'fixed',
          top: drawerTop,
          height: drawerHeight,
          right: 0,
          width: '100%',
          maxWidth: '1100px',
          marginLeft: 'auto',
          background: 'white',
          zIndex: 50,
          boxShadow: 'var(--shadow-xl)',
          borderLeft: '1px solid var(--color-gray-200)',
          borderTopLeftRadius: 'var(--radius-2xl)',
          borderBottomLeftRadius: 'var(--radius-2xl)',
          transition: 'transform 0.3s ease-out',
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="detail-drawer-header" style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid var(--color-gray-200)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-md) var(--spacing-lg)', gap: 'var(--spacing-md)' }}>
            <div>
              <h2 className="detail-drawer-title">Detailanalyse der Aufgaben</h2>
              {activeAnalysis._manualOverride?.edited && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                  Manuell bearbeitet am {new Date(activeAnalysis._manualOverride.editedAt).toLocaleString('de-DE')}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {!isDemo && activeTab === 'analyse' && !isEditMode && (
                <button type="button" onClick={() => setIsEditMode(true)} className="secondary-button">
                  Bearbeiten
                </button>
              )}
              {!isDemo && activeTab === 'analyse' && isEditMode && (
                <>
                  <button type="button" onClick={handleCancelEditing} className="secondary-button" disabled={isSaving}>
                    Abbrechen
                  </button>
                  <button type="button" onClick={handleSave} className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Speichert…' : 'Änderungen speichern'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{ padding: 'var(--spacing-sm)', borderRadius: '50%', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-100)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                aria-label="Schließen"
              >
                <svg
                  style={{ width: '20px', height: '20px', color: 'var(--color-gray-500)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="detail-drawer-body" style={{ overflowY: 'auto' }}>
          <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-xl)', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.25rem' }}>Punkte</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{overview.points}</p>
              </div>
              <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-xl)', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.25rem' }}>Prozent</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{Math.round(overview.percentage)}%</p>
              </div>
              <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-xl)', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.25rem' }}>Note</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{overview.note}</p>
              </div>
            </div>

            <div className="detail-drawer-tabs" style={{ display: 'flex', gap: 'var(--spacing-sm)', borderRadius: 'var(--radius-xl)', background: 'var(--color-gray-100)', padding: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-600)' }}>
              <button type="button" onClick={() => setActiveTab('klausur')} style={{ flex: 1, padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: activeTab === 'klausur' ? 'white' : 'transparent', color: activeTab === 'klausur' ? 'var(--color-gray-900)' : 'var(--color-gray-600)', boxShadow: activeTab === 'klausur' ? 'var(--shadow-sm)' : 'none', opacity: isDemo ? 0.6 : 1 }}>
                Klausur
              </button>
              <button type="button" onClick={() => setActiveTab('erwartung')} style={{ flex: 1, padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: activeTab === 'erwartung' ? 'white' : 'transparent', color: activeTab === 'erwartung' ? 'var(--color-gray-900)' : 'var(--color-gray-600)', boxShadow: activeTab === 'erwartung' ? 'var(--shadow-sm)' : 'none', opacity: isDemo ? 0.6 : 1 }}>
                Erwartungshorizont
              </button>
              <button type="button" onClick={() => setActiveTab('analyse')} style={{ flex: 1, padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: activeTab === 'analyse' ? 'white' : 'transparent', color: activeTab === 'analyse' ? 'var(--color-gray-900)' : 'var(--color-gray-600)', boxShadow: activeTab === 'analyse' ? 'var(--shadow-sm)' : 'none' }}>
                Analyse
              </button>
            </div>

            <div>
              {activeTab === 'klausur' && (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                  <div style={{ position: 'relative', minHeight: '220px', width: '100%', borderRadius: 'var(--radius-xl)', background: 'rgba(15, 23, 42, 0.95)', color: '#f1f5f9' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)' }}>
                      <p style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>Klausur (Scan)</p>
                      {isDemo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <p style={{ fontSize: '0.875rem', color: '#fbbf24', fontWeight: 600 }}>Beispielansicht</p>
                          <p style={{ fontSize: '0.75rem', color: '#cbd5e1', textAlign: 'center', maxWidth: '320px', lineHeight: '1.5' }}>
                            Bei der echten Nutzung können Sie hier Ihre hochgeladene Klausur direkt öffnen und ansehen.
                          </p>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openInNewTab(klausurUrl)} disabled={!klausurUrl} className="secondary-button">
                          Klausur öffnen
                        </button>
                      )}
                    </div>
                  </div>

                  {!isDemo && (
                    <details
                      style={{
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: 'var(--radius-xl)',
                        background: 'var(--color-gray-50)',
                        padding: 'var(--spacing-md)',
                      }}
                    >
                      <summary
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--spacing-md)',
                          listStyle: 'none',
                          fontWeight: 600,
                          color: 'var(--color-gray-900)',
                        }}
                      >
                        <span>Extrahierter OCR-Text</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            color: 'var(--color-gray-600)',
                            background: 'white',
                            border: '1px solid var(--color-gray-300)',
                            borderRadius: '999px',
                            padding: '0.2rem 0.55rem',
                          }}
                        >
                          Nur intern
                        </span>
                      </summary>

                      <div style={{ display: 'grid', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', lineHeight: '1.5' }}>
                          Aus der hochgeladenen PDF extrahiert. Dieser Block dient nur der internen Prüfung und ist nicht Teil der Bewertung.
                        </p>

                        {ocrInspection.kind === 'available' && (
                          <pre
                            style={{
                              margin: 0,
                              padding: 'var(--spacing-md)',
                              borderRadius: 'var(--radius-lg)',
                              border: '1px solid var(--color-gray-200)',
                              background: 'white',
                              color: 'var(--color-gray-900)',
                              fontSize: '0.8125rem',
                              lineHeight: '1.55',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              overflowY: 'auto',
                              maxHeight: '320px',
                              fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
                            }}
                          >
                            {ocrInspection.text}
                          </pre>
                        )}

                        {ocrInspection.kind === 'empty' && (
                          <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)', background: 'white', color: 'var(--color-gray-700)', fontSize: '0.875rem' }}>
                            Die OCR-Erkennung wurde gespeichert, hat für diese Klausur aber keinen lesbaren Text geliefert.
                          </div>
                        )}

                        {ocrInspection.kind === 'legacy' && (
                          <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)', background: 'white', color: 'var(--color-gray-700)', fontSize: '0.875rem' }}>
                            Für diesen älteren Eintrag liegt noch kein gespeicherter OCR-Text vor.
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {activeTab === 'erwartung' && (
                <div style={{ position: 'relative', height: '320px', width: '100%', borderRadius: 'var(--radius-xl)', background: 'rgba(15, 23, 42, 0.95)', color: '#f1f5f9' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)' }}>
                    <p style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>Erwartungshorizont</p>
                    {isDemo ? (
                      <p style={{ fontSize: '0.75rem', color: '#cbd5e1', textAlign: 'center', maxWidth: '320px', lineHeight: '1.5' }}>
                        Bei der echten Nutzung können Sie hier Ihren hochgeladenen Erwartungshorizont direkt öffnen und ansehen.
                      </p>
                    ) : (
                      <button type="button" onClick={() => openInNewTab(expectationUrl)} disabled={!expectationUrl} className="secondary-button">
                        Erwartungshorizont öffnen
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'analyse' && (
                <>
                  {isLoading ? (
                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                      Lade Detailanalyse...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                      <div style={{ padding: 'var(--spacing-lg)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>
                          Gesamtbewertung
                        </p>
                        {isEditMode && draft ? (
                          <textarea
                            value={draft.summary}
                            onChange={(event) => handleSummaryChange(event.target.value)}
                            rows={5}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)', resize: 'vertical' }}
                          />
                        ) : (
                          <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', color: 'var(--color-gray-800)' }}>
                            {overview.summary || 'Keine zusammenfassende Bewertung vorhanden.'}
                          </p>
                        )}
                      </div>

                      {isEditMode && draft ? (
                        draft.tasks.map((task, index) => (
                          <EditableTaskCard
                            key={`${task.taskId}-${index}`}
                            task={task}
                            index={index}
                            onChange={handleTaskDraftChange}
                          />
                        ))
                      ) : displayTasks.length > 0 ? (
                        <div className="detail-drawer-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                          {displayTasks.map((task, index) => (
                            <TaskAccordion key={`${task.taskId}-${index}`} task={task} />
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                          Keine Aufgaben gefunden.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
