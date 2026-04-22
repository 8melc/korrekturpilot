import type { KlausurAnalyse } from '@/lib/openai';

/**
 * Gemeinsame Datenstruktur für die Analyse
 * Diese Struktur wird EINMAL von der KI generiert und dann
 * in zwei verschiedenen Formaten gerendert (Lehrer-ResultCard und Schüler-DOCX)
 */

export interface ParsedAnalysis {
  // Gesamtbewertung
  gesamtpunkte: number;
  erreichtePunkte: number;
  prozent: number;
  note: string;

  // Zusammenfassung
  strengths: string[]; // Stärken als Array von Bullet-Points
  nextSteps: string[]; // Nächste Schritte als Array von Bullet-Points
  summary: string; // Zusammenfassender Text

  // Aufgaben-Details
  aufgaben: AnalysisTask[];
}

export interface AnalysisTask {
  taskId: string; // z.B. "1.1", "2.3"
  taskTitle: string; // z.B. "Strukturformeln", "Reaktionsgleichung"
  maxPunkte: number;
  erreichtePunkte: number;
  studentAnswer?: string; // Optional: Die Schülerantwort
  
  // Bewertungsdetails (in 3. Person für Lehrer, wird für Schüler umformuliert)
  whatIsCorrect: string[]; // Was war richtig (vollständige Sätze)
  whatIsWrong: string[]; // Was war falsch / Abzüge (vollständige Sätze)
  improvementTips: string[]; // Verbesserungstipps (vollständige Sätze)
  pointsReasoning: string; // Begründung der Punktevergabe
  shortEvaluation?: string; // Kurze Bewertung (optional)
  korrekturen?: string[]; // Zusätzliche Korrekturen (für Rückwärtskompatibilität)
  
  // Warnung für Zeichnungsaufgaben
  benoetigtManuelleKorrektur?: boolean; // True wenn Zeichnungsaufgabe mit 0 Punkten
  warnung?: string; // Warnungstext für UI
}

/**
 * Mappt die aktuelle KlausurAnalyse zu ParsedAnalysis
 * (für Rückwärtskompatibilität)
 */
export function mapToParsedAnalysis(
  analysis: KlausurAnalyse,
  gradeLabel: string
): ParsedAnalysis {
  const { _internal: _ignoredInternal, ...publicAnalysis } = analysis;

  // Parse Zusammenfassung in Stärken und Nächste Schritte
  const strengths: string[] = [];
  const nextSteps: string[] = [];
  
  const summary = publicAnalysis.zusammenfassung || '';
  
  // Versuche Stärken zu extrahieren
  const strengthsMatch = summary.match(/(?:STÄRKEN|Stärken|STRENGTHS)[:\s]*([\s\S]*?)(?=NÄCHSTE|ENTWICKLUNGS|DEVELOPMENT|$)/i);
  if (strengthsMatch) {
    const strengthsText = strengthsMatch[1].trim();
    // Versuche Bullet-Points zu extrahieren
    const bullets = strengthsText.split(/[•\-\*]/).filter(s => s.trim());
    if (bullets.length > 0) {
      strengths.push(...bullets.map(s => s.trim()));
    } else {
      // Falls keine Bullets, versuche nach Sätzen zu splitten
      const sentences = strengthsText.split(/[.;]/).filter(s => s.trim().length > 10);
      strengths.push(...sentences.map(s => s.trim()));
    }
  }
  
  // Versuche Nächste Schritte zu extrahieren
  const nextStepsMatch = summary.match(/(?:NÄCHSTE SCHRITTE|ENTWICKLUNGSBEREICHE|DEVELOPMENT|Nächste Schritte)[:\s]*([\s\S]*?)$/i);
  if (nextStepsMatch) {
    const nextStepsText = nextStepsMatch[1].trim();
    const bullets = nextStepsText.split(/[•\-\*]/).filter(s => s.trim());
    if (bullets.length > 0) {
      nextSteps.push(...bullets.map(s => s.trim()));
    } else {
      const sentences = nextStepsText.split(/[.;]/).filter(s => s.trim().length > 10);
      nextSteps.push(...sentences.map(s => s.trim()));
    }
  }

  // Falls keine strukturierten Stärken gefunden, versuche aus Aufgaben zu extrahieren
  if (strengths.length === 0) {
    publicAnalysis.aufgaben.forEach((aufgabe) => {
      const comment = aufgabe.kommentar || '';
      const richtigMatch = comment.match(/(?:DAS WAR RICHTIG|richtig|korrekt)[:\s]*([\s\S]*?)(?=HIER GAB|ABZÜGE|VERBESSERUNG|$)/i);
      if (richtigMatch) {
        const text = richtigMatch[1].trim();
        if (text && text.length > 20) {
          strengths.push(text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
      }
    });
  }

  // KRITISCH: Berechne Gesamtpunkte aus Einzelaufgaben (KI kann falsche Werte liefern)
  const calculatedMaxPoints = publicAnalysis.aufgaben.reduce((sum: number, aufgabe: any) => {
    return sum + (aufgabe.maxPunkte || 0);
  }, 0);
  
  const calculatedAchievedPoints = publicAnalysis.aufgaben.reduce((sum: number, aufgabe: any) => {
    return sum + (aufgabe.erreichtePunkte || 0);
  }, 0);

  // Verwende berechnete Punkte, falls vorhanden, sonst Fallback auf KI-Werte
  const gesamtpunkte = calculatedMaxPoints > 0 ? calculatedMaxPoints : publicAnalysis.gesamtpunkte;
  const erreichtePunkte = calculatedAchievedPoints > 0 ? calculatedAchievedPoints : publicAnalysis.erreichtePunkte;
  const prozent = gesamtpunkte > 0 ? (erreichtePunkte / gesamtpunkte) * 100 : publicAnalysis.prozent;

  // Berechne Note basierend auf korrektem Prozentsatz (falls gradeLabel falsch ist)
  // Verwende SEK I Notenschlüssel als Fallback
  let calculatedNote = gradeLabel;
  if (prozent > 0) {
    // Importiere getGradeInfo (wird dynamisch importiert, um Zirkel-Importe zu vermeiden)
    // Für jetzt verwenden wir eine einfache Berechnung
    if (prozent >= 98) calculatedNote = "1+";
    else if (prozent >= 95) calculatedNote = "1";
    else if (prozent >= 92) calculatedNote = "1−";
    else if (prozent >= 88) calculatedNote = "2+";
    else if (prozent >= 80) calculatedNote = "2";
    else if (prozent >= 74) calculatedNote = "2−";
    else if (prozent >= 68) calculatedNote = "3+";
    else if (prozent >= 62) calculatedNote = "3";
    else if (prozent >= 59) calculatedNote = "3−";
    else if (prozent >= 53) calculatedNote = "4+";
    else if (prozent >= 46) calculatedNote = "4";
    else if (prozent >= 39) calculatedNote = "4−";
    else if (prozent >= 33) calculatedNote = "5+";
    else if (prozent >= 26) calculatedNote = "5";
    else if (prozent >= 19) calculatedNote = "5−";
    else calculatedNote = "6";
  }

  return {
    gesamtpunkte,
    erreichtePunkte,
    prozent,
    note: calculatedNote,
    strengths: strengths.length > 0 ? strengths : [],
    nextSteps: nextSteps.length > 0 ? nextSteps : [],
    summary: summary,
    aufgaben: publicAnalysis.aufgaben.map((aufgabe, index) => {
      // Parse Kommentar in whatIsCorrect, whatIsWrong, improvementTips
      const comment = aufgabe.kommentar || '';
      const whatIsCorrect: string[] = [];
      const whatIsWrong: string[] = [];
      const improvementTips: string[] = [];

      // Suche nach strukturierten Abschnitten (case-insensitive, flexibel)
      const richtigMatch = comment.match(/(?:DAS WAR RICHTIG|richtig|korrekt|korrekte aspekte)[:\s]*([\s\S]*?)(?=HIER GAB|ABZÜGE|VERBESSERUNG|PUNKTEABZUG|$)/i);
      if (richtigMatch) {
        const text = richtigMatch[1].trim();
        if (text) {
          // Versuche Bullet-Points oder Sätze zu extrahieren
          const bullets = text.split(/[•\-\*]/).filter(s => s.trim());
          if (bullets.length > 1) {
            whatIsCorrect.push(...bullets.map(s => s.trim()));
          } else {
            const sentences = text.split(/[.;]/).filter(s => s.trim().length > 10);
            whatIsCorrect.push(...sentences.map(s => s.trim()));
          }
        }
      }

      const abzuegeMatch = comment.match(/(?:HIER GAB ES ABZÜGE|ABZÜGE|PUNKTEABZUG|fehler|abzug)[:\s]*([\s\S]*?)(?=VERBESSERUNG|TIPP|$)/i);
      if (abzuegeMatch) {
        const text = abzuegeMatch[1].trim();
        if (text) {
          const bullets = text.split(/[•\-\*]/).filter(s => s.trim());
          if (bullets.length > 1) {
            whatIsWrong.push(...bullets.map(s => s.trim()));
          } else {
            const sentences = text.split(/[.;]/).filter(s => s.trim().length > 10);
            whatIsWrong.push(...sentences.map(s => s.trim()));
          }
        }
      }

      const tippMatch = comment.match(/(?:VERBESSERUNGSTIPP|TIPP|verbesserung|hinweis)[:\s]*([\s\S]*?)$/i);
      if (tippMatch) {
        const text = tippMatch[1].trim();
        if (text) {
          const bullets = text.split(/[•\-\*]/).filter(s => s.trim());
          if (bullets.length > 1) {
            improvementTips.push(...bullets.map(s => s.trim()));
          } else {
            const sentences = text.split(/[.;]/).filter(s => s.trim().length > 10);
            improvementTips.push(...sentences.map(s => s.trim()));
          }
        }
      }

      // Extrahiere taskId und taskTitle aus aufgabe
      // Unterstützt verschiedene Formate: "1.1: Strukturformeln", "Aufgabe 1.1", "1.1 Strukturformeln"
      const taskMatch = aufgabe.aufgabe.match(/^(\d+\.\d+)[:\s]*(.+)$/) || 
                        aufgabe.aufgabe.match(/^Aufgabe\s+(\d+\.\d+)[:\s]*(.+)$/i) ||
                        aufgabe.aufgabe.match(/^(\d+\.\d+)\s+(.+)$/);
      const taskId = taskMatch ? taskMatch[1] : `${index + 1}.1`;
      const taskTitle = taskMatch ? taskMatch[2].trim() : aufgabe.aufgabe;

      // Prüfe ob es eine Zeichnungsaufgabe ist
      const istZeichnungsAufgabe = 
        taskTitle.toLowerCase().includes('zeichnen') ||
        taskTitle.toLowerCase().includes('strukturformel') ||
        taskTitle.toLowerCase().includes('darstellen') ||
        aufgabe.aufgabe.toLowerCase().includes('zeichnen') ||
        aufgabe.aufgabe.toLowerCase().includes('strukturformel') ||
        aufgabe.aufgabe.toLowerCase().includes('darstellen');

      // Warnung für Zeichnungsaufgaben mit 0 Punkten
      const benoetigtManuelleKorrektur = istZeichnungsAufgabe && aufgabe.erreichtePunkte === 0;
      const warnung = benoetigtManuelleKorrektur 
        ? "⚠️ Strukturformel-Aufgabe mit 0 Punkten - Die KI hat Schwierigkeiten bei handgezeichneten Strukturformeln. Bitte manuell überprüfen!"
        : undefined;

      return {
        taskId,
        taskTitle,
        maxPunkte: aufgabe.maxPunkte,
        erreichtePunkte: aufgabe.erreichtePunkte,
        whatIsCorrect: whatIsCorrect.length > 0 ? whatIsCorrect : [],
        whatIsWrong: whatIsWrong.length > 0 ? whatIsWrong : [],
        improvementTips: improvementTips.length > 0 ? improvementTips : [],
        pointsReasoning: `Die Schülerin/der Schüler erreichte ${aufgabe.erreichtePunkte} von ${aufgabe.maxPunkte} Punkten.`,
        korrekturen: aufgabe.korrekturen || [],
        benoetigtManuelleKorrektur,
        warnung,
      };
    }),
  };
}
