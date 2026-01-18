/**
 * Parst den Kommentar-Text einer Aufgabe und extrahiert die verschiedenen Abschnitte
 */

export interface ParsedTaskComment {
  dasWarRichtig: string;
  hierGabEsAbzuege: string;
  verbesserungstipp: string;
  korrekturen: string[];
}

export function parseTaskComment(comment: string, korrekturen: string[] = []): ParsedTaskComment {
  const result: ParsedTaskComment = {
    dasWarRichtig: '',
    hierGabEsAbzuege: '',
    verbesserungstipp: '',
    korrekturen: korrekturen || [],
  };

  // Teile den Kommentar in Abschnitte auf
  const sections = comment.split(/\n\n/);

  for (const section of sections) {
    if (section.includes('DAS WAR RICHTIG:')) {
      result.dasWarRichtig = section.replace(/DAS WAR RICHTIG:\s*/i, '').trim();
    } else if (section.includes('HIER GAB ES ABZÜGE:') || section.includes('HIER GAB ES ABZUEGE:')) {
      result.hierGabEsAbzuege = section.replace(/HIER GAB ES ABZÜGE:\s*/i, '').replace(/HIER GAB ES ABZUEGE:\s*/i, '').trim();
    } else if (section.includes('VERBESSERUNGSTIPP:') || section.includes('VERBESSERUNGSTIP:')) {
      result.verbesserungstipp = section.replace(/VERBESSERUNGSTIPP:\s*/i, '').replace(/VERBESSERUNGSTIP:\s*/i, '').trim();
    }
  }

  return result;
}

/**
 * Extrahiert Stärken und nächste Schritte aus der Zusammenfassung
 */
export function parseSummary(summary: string): {
  staerken: string[];
  naechsteSchritte: string[];
} {
  const staerken: string[] = [];
  const naechsteSchritte: string[] = [];

  // Teile die Zusammenfassung in Sätze auf
  const sentences = summary.split(/\.\s+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Stärken-Indikatoren
    const staerkenKeywords = [
      'zeigt', 'hat', 'ist', 'sind', 'war', 'waren', 'gutes', 'gute', 'klar', 
      'korrekt', 'richtig', 'verstanden', 'erkannt', 'benannt', 'dargestellt',
      'unterscheidung', 'trennung', 'grundstruktur', 'phasen', 'strukturen',
      'hervorragend', 'sehr gut', 'exzellent'
    ];
    
    // Verbesserungs-Indikatoren
    const verbesserungKeywords = [
      'sollte', 'könnte', 'fehlt', 'fehlen', 'vergessen', 'müsste', 'sollten', 
      'könnten', 'mangel', 'schwäche', 'verbesserung', 'präziser', 'detaillierter'
    ];

    const hasStaerkenKeyword = staerkenKeywords.some(keyword => lowerSentence.includes(keyword));
    const hasVerbesserungKeyword = verbesserungKeywords.some(keyword => lowerSentence.includes(keyword));

    if (hasStaerkenKeyword && !hasVerbesserungKeyword) {
      // Formuliere um: "Du hast..." → "Die Arbeit zeigt..."
      let formatted = sentence.trim();
      formatted = formatted.replace(/^Du\s+/, 'Die Arbeit ');
      formatted = formatted.replace(/^Du\s+/, 'Die Arbeit ');
      formatted = formatted.replace(/hast\s+/, 'zeigt ');
      formatted = formatted.replace(/zeigst\s+/, 'zeigt ');
      staerken.push(formatted + '.');
    } else if (hasVerbesserungKeyword) {
      // Formuliere um: "Du solltest..." → "Es sollte..."
      let formatted = sentence.trim();
      formatted = formatted.replace(/^Du\s+(solltest|könntest|müsstest|sollte|könnte|müsste)/i, 'Es sollte');
      formatted = formatted.replace(/^Übe\s+/, 'Weiteres Üben von ');
      formatted = formatted.replace(/^Beschreibe\s+/, 'Die Beschreibung von ');
      naechsteSchritte.push(formatted + '.');
    }
  }

  // Fallback: Wenn keine gefunden, teile die Zusammenfassung auf
  if (staerken.length === 0 && naechsteSchritte.length === 0) {
    const midPoint = Math.ceil(sentences.length / 2);
    staerken.push(...sentences.slice(0, midPoint).map(s => s.trim() + '.'));
    naechsteSchritte.push(...sentences.slice(midPoint).map(s => s.trim() + '.'));
  }

  // Mindestens eine Stärke und einen nächsten Schritt
  if (staerken.length === 0) {
    staerken.push('Die Arbeit zeigt ein gutes Grundverständnis des Themas.');
  }
  if (naechsteSchritte.length === 0) {
    naechsteSchritte.push('Weiteres Üben und Vertiefen des Verständnisses wird empfohlen.');
  }

  return {
    staerken: staerken.slice(0, 5), // Maximal 5 Stärken
    naechsteSchritte: naechsteSchritte.slice(0, 5), // Maximal 5 nächste Schritte
  };
}







