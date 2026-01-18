/**
 * UX Helper-Funktionen für visuelle Verbesserungen
 */

/**
 * Gibt die Farbe-Konfiguration basierend auf der Note zurück
 */
export function getNoteColorConfig(note: string): {
  border: string;
  bg: string;
  text: string;
} {
  const noteBase = note.replace(/[+-]/, '').trim();
  
  const configs: Record<string, { border: string; bg: string; text: string }> = {
    '1': {
      border: 'border-l-4 border-green-500',
      bg: 'bg-green-50',
      text: 'text-green-900',
    },
    '2': {
      border: 'border-l-4 border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-900',
    },
    '3': {
      border: 'border-l-4 border-yellow-500',
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
    },
    '4': {
      border: 'border-l-4 border-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-900',
    },
    '5': {
      border: 'border-l-4 border-red-500',
      bg: 'bg-red-50',
      text: 'text-red-900',
    },
    '6': {
      border: 'border-l-4 border-red-600',
      bg: 'bg-red-100',
      text: 'text-red-900',
    },
  };

  return configs[noteBase] || {
    border: 'border-l-4 border-gray-400',
    bg: 'bg-gray-50',
    text: 'text-gray-900',
  };
}

/**
 * Status-Konfiguration für Badges (OHNE Emojis)
 */
export function getStatusConfig(status: string): {
  icon: 'check' | 'clock' | 'x' | 'question';
  text: string;
  bg: string;
  textColor: string;
  border: string;
} {
  const configs: Record<string, { icon: 'check' | 'clock' | 'x' | 'question'; text: string; bg: string; textColor: string; border: string }> = {
    'Bereit': {
      icon: 'check',
      text: 'Bereit',
      bg: 'bg-green-100',
      textColor: 'text-green-800',
      border: 'border-green-200',
    },
    'Analyse läuft…': {
      icon: 'clock',
      text: 'In Bearbeitung',
      bg: 'bg-blue-100',
      textColor: 'text-blue-800',
      border: 'border-blue-200',
    },
    'Fehler': {
      icon: 'x',
      text: 'Fehler',
      bg: 'bg-red-100',
      textColor: 'text-red-800',
      border: 'border-red-200',
    },
  };

  return configs[status] || {
    icon: 'question',
    text: status,
    bg: 'bg-gray-100',
    textColor: 'text-gray-800',
    border: 'border-gray-200',
  };
}








