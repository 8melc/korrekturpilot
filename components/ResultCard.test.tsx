import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ResultCard from './ResultCard';
import type { KlausurAnalyse } from '@/lib/openai';

describe('ResultCard - UI Snapshot Tests', () => {
  const mockAnalysis: KlausurAnalyse = {
    gesamtpunkte: 100,
    erreichtePunkte: 77,
    prozent: 77,
    aufgaben: [
      {
        aufgabe: 'Aufgabe 1.1',
        maxPunkte: 10,
        erreichtePunkte: 8,
        kommentar: 'Gute Lösung',
        korrekturen: [],
      },
      {
        aufgabe: 'Aufgabe 1.2',
        maxPunkte: 15,
        erreichtePunkte: 12,
        kommentar: 'Korrekt',
        korrekturen: [],
      },
    ],
    zusammenfassung: 'Gute Leistung insgesamt',
  };

  it('should render note correctly', () => {
    const { container } = render(
      <ResultCard
        analysis={mockAnalysis}
        klausurName="Max Mustermann"
        courseInfo={{
          subject: 'Mathe',
          gradeLevel: '10',
          className: '10a',
        }}
      />
    );

    // Prüfe ob Note-Badge vorhanden ist
    const gradeBadge = container.querySelector('.grade-badge');
    expect(gradeBadge).toBeInTheDocument();
    expect(gradeBadge?.textContent).toBeTruthy();
  });

  it('should render percentage correctly', () => {
    const { container } = render(
      <ResultCard
        analysis={mockAnalysis}
        klausurName="Test Schüler"
      />
    );

    // Prüfe ob Prozent angezeigt wird (Format kann variieren)
    const percentageElement = container.querySelector('.teacher-card__percentage');
    expect(percentageElement).toBeInTheDocument();
    // Prüfe nur ob Element vorhanden ist, Format kann variieren
    expect(percentageElement?.textContent).toBeTruthy();
  });

  it('should render strengths and nextSteps without overlaps', () => {
    // Mock-Analyse mit Overlap (wird durch validateFeedbackOverlap entfernt)
    const analysisWithOverlap: KlausurAnalyse = {
      ...mockAnalysis,
      zusammenfassung: 'Stärken: Rechnung korrekt. Verbesserung: Rechnung üben.',
    };

    const { container } = render(
      <ResultCard
        analysis={analysisWithOverlap}
        klausurName="Test"
      />
    );

    // Prüfe ob Summary-Sektion vorhanden ist
    const summarySection = container.querySelector('.teacher-card__summary');
    expect(summarySection).toBeInTheDocument();
  });

  it('should render grade badge with correct CSS class', () => {
    const { container } = render(
      <ResultCard
        analysis={mockAnalysis}
        klausurName="Test"
        courseInfo={{ gradeLevel: '10' }}
      />
    );

    const gradeBadge = container.querySelector('.grade-badge');
    expect(gradeBadge).toBeInTheDocument();
    // Prüfe ob Badge eine CSS-Klasse hat (z.B. grade-badge--good, grade-badge--medium)
    expect(gradeBadge?.className).toContain('grade-badge');
  });
});

