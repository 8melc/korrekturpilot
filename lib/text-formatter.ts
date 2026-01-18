/**
 * Bereinigt und formatiert Text für die Anzeige
 * - Entfernt doppelte Leerzeichen
 * - Korrigiert Satzzeichen-Abstände
 * - Stellt sicher, dass Sätze mit Großbuchstaben beginnen
 * - Fügt fehlende Satzzeichen hinzu
 */
export function cleanAndFormatText(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // 1. Entferne doppelte Leerzeichen
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 2. Stelle sicher, dass nach Punkten Leerzeichen folgen
  cleaned = cleaned.replace(/\.([A-ZÄÖÜ])/g, '. $1');
  
  // 3. Entferne Leerzeichen vor Punkten
  cleaned = cleaned.replace(/\s+\./g, '.');
  
  // 4. Stelle sicher, dass Sätze mit Großbuchstaben beginnen
  cleaned = cleaned.replace(/(^|\.\s+)([a-zäöü])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
  
  // 5. Trim Start/End
  cleaned = cleaned.trim();
  
  // 6. Stelle sicher, dass Satz mit Punkt endet (falls nicht)
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned;
}


