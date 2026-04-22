'use client';

import { useState, useEffect } from 'react';
import { downloadAnalysisDoc } from '@/lib/downloadDoc';
import { getGradeInfo, getPerformanceLevel, gradeColor } from '@/lib/grades';
import { mapToParsedAnalysis } from '@/types/analysis';
import { renderTeacherResultSection } from '@/lib/renderers/teacher-renderer';
import { buildTeacherSummaryFromTasks, type TeacherSummaryOutput } from '@/lib/build-teacher-summary';
import { isDemoId } from '@/lib/demoData';
import type { StoredResultEntry } from '@/types/results';

interface ResultCompactViewProps {
  entry: StoredResultEntry;
  onShowDetails: () => void;
  onShowPreview?: () => void; // Optional: für Demo-Daten
}

export default function ResultCompactView({ entry, onShowDetails, onShowPreview }: ResultCompactViewProps) {
  const { analysis } = entry;
  if (!analysis) return null;

  const [teacherView, setTeacherView] = useState<ReturnType<typeof renderTeacherResultSection> | null>(null);
  const [summary, setSummary] = useState<TeacherSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<boolean>(false);

  const percentage = analysis.prozent;
  const gradeLevel = entry.course.gradeLevel ? parseInt(entry.course.gradeLevel, 10) || 10 : 10;
  const gradeInfo = getGradeInfo({ prozent: percentage, gradeLevel });
  const grade = gradeInfo.label;
  const performanceLevel = getPerformanceLevel(percentage);

  // Lade Lehrer-Ansicht und Summary
  useEffect(() => {
    if (!analysis) return;

    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const parsed = mapToParsedAnalysis(analysis, '');
        const view = renderTeacherResultSection(parsed, gradeLevel);
        setTeacherView(view);

        // Cache-Key erstellen
        const manualOverrideVersion =
          typeof analysis._manualOverride?.version === 'number'
            ? analysis._manualOverride.version
            : analysis._manualOverride?.editedAt || 'original';
        const cacheKey = `teacher-summary-${entry.id}-${view.tasks.length}-${view.overall.percentage}-${manualOverrideVersion}`;

        // Prüfe localStorage für gecachte Summary
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const cachedSummary = JSON.parse(cached) as TeacherSummaryOutput;
              setSummary(cachedSummary);
              setIsLoading(false);
              return;
            } catch (e) {
              console.error('Fehler beim Parsen der gecachten Summary:', e);
            }
          }
        }

        // Wenn nicht gecacht, hole Summary von API
        const teacherSummary = await buildTeacherSummaryFromTasks(view.tasks, view.overall.percentage);
        setSummary(teacherSummary);

        // Cache in localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(teacherSummary));
          } catch (e) {
            console.error('Fehler beim Cachen der Summary:', e);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Zusammenfassung:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [analysis, entry.id, gradeLevel]);

  const handleDownload = async () => {
    if (isDownloading && !downloadError) return;
    
    setIsDownloading(true);
    setDownloadError(false);
    
    try {
      // Für Demo-Daten: Dateiname mit "Demo" kennzeichnen
      const fileName = isDemoId(entry.id) 
        ? `Demo_${entry.studentName.replace(/\s+/g, '_')}_${entry.course.subject}`
        : entry.studentName;
      
      await downloadAnalysisDoc(fileName, analysis, entry.course);
      
      // Bei Erfolg: Button bleibt deaktiviert (Download läuft)
      // Nach kurzer Verzögerung wieder aktivieren, falls Download erfolgreich war
      setTimeout(() => {
        setIsDownloading(false);
      }, 3000);
    } catch (error) {
      // Bei Fehler: Button wieder aktivieren, damit User es erneut versuchen kann
      setDownloadError(true);
      setIsDownloading(false);
    }
  };

  return (
    <div className="result-compact-view">
      {/* Kopfbereich mit integrierter Punkteübersicht */}
      <div className="result-compact-header">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--spacing-xl)', alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
            <div>
              <p style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}>Dateiname</p>
              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{entry.fileName || entry.studentName}</p>
            </div>
            <div>
              <p style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}>Fach</p>
              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{entry.course.subject}</p>
            </div>
            <div>
              <p style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}>Jahrgang</p>
              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{entry.course.gradeLevel || '–'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}>Klasse / Kurs</p>
              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{entry.course.className || '–'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}>Schuljahr</p>
              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{entry.course.schoolYear}</p>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: 'var(--spacing-md)', width: '256px' }}>
            {/* Circular Progress + Punkte */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                <svg style={{ transform: 'rotate(-90deg)', width: '64px', height: '64px' }} viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={percentage >= 80 ? '#10b981' : percentage >= 60 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${percentage}, 100`}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>{Math.round(percentage)}%</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                  {analysis.erreichtePunkte} <span style={{ color: 'var(--color-gray-400)', fontSize: '1.125rem' }}>/ {analysis.gesamtpunkte}</span>
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>Punkte erreicht</p>
              </div>
            </div>

            {/* Note */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-gray-200)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', fontWeight: 500 }}>Note</span>
              <span className={gradeInfo.badgeClass} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
                {grade}
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Zusammenfassung */}
      <div className="result-compact-summary" style={{ marginTop: 'var(--spacing-lg)' }}>
        <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Zusammenfassung</h4>
        <div className="result-compact-summary-content">
          {isLoading ? (
            <p style={{ color: 'var(--color-gray-500)' }}>Lade Zusammenfassung...</p>
          ) : (
            <>
              {(() => {
                const displayStrengths = summary?.strengthsSummary || [];
                const displayNextSteps = summary?.developmentAreasSummary || [];
                const hasStrengths = displayStrengths.length > 0;
                const hasNextSteps = displayNextSteps.length > 0;

                return (
                  <>
                    {hasStrengths && (
                      <div className="summary-section summary-section--strengths">
                        <p className="summary-section__title">Stärken</p>
                        <div>
                          {displayStrengths.map((strength, idx) => (
                            <p key={idx} style={{ marginBottom: '0.25rem', textAlign: 'left' }}>
                              {strength}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {hasNextSteps && (
                      <div className="summary-section summary-section--development">
                        <p className="summary-section__title">Entwicklungsbereiche</p>
                        <div style={{ color: 'var(--color-gray-700)' }}>
                          {displayNextSteps.map((step, idx) => {
                            const sentences = step
                              .split(/(?<=[.!?])\s+/)
                              .filter((s) => s.trim().length > 0);
                            if (sentences.length > 1) {
                              return (
                                <div key={idx} style={{ marginBottom: 'var(--spacing-sm)' }}>
                                  {sentences.map((sentence, sIdx) => (
                                    <p key={sIdx} style={{ marginBottom: '0.25rem', lineHeight: '1.625' }}>
                                      {sentence.trim()}
                                    </p>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <p key={idx} style={{ marginBottom: '0.25rem', lineHeight: '1.625' }}>
                                {step}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!hasStrengths && !hasNextSteps && (
                      <p style={{ lineHeight: '1.625', color: 'var(--color-gray-700)' }}>
                        {teacherView?.summary.overallSummary ||
                          analysis.zusammenfassung ||
                          'Keine zusammenfassende Bewertung vorhanden.'}
                      </p>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div
        className="result-compact-actions"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          gap: 'var(--spacing-md)', 
          marginBottom: 'var(--spacing-2xl)',
          marginTop: '4.25rem'
        }}
      >
        <button
          type="button"
          onClick={onShowDetails}
          className="primary-button"
          style={{ flex: 1 }}
        >
          Details anzeigen
        </button>
        {onShowPreview ? (
          <button
            type="button"
            onClick={onShowPreview}
            className="secondary-button"
            style={{ flex: 1 }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'inline-block', marginRight: 'var(--spacing-sm)' }}
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Feedback-Vorschau anzeigen
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading && !downloadError}
            className="secondary-button"
            style={{
              flex: 1,
              opacity: isDownloading && !downloadError ? 0.6 : 1,
              cursor: isDownloading && !downloadError ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'inline-block', marginRight: 'var(--spacing-sm)' }}
            >
              <path d="M12 5v13M12 18l4-4M12 18l-4-4M20 20H4" />
            </svg>
            {isDownloading && !downloadError ? 'Wird heruntergeladen...' : 'Schülerfeedback herunterladen'}
          </button>
        )}
      </div>
    </div>
  );
}
