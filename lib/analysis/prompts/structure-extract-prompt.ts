/**
 * Prompt zur Struktur-Extraktion aus dem Erwartungshorizont.
 *
 * Ein kleiner, fokussierter KI-Call, der nur eine Aufgabe hat: aus einem
 * Erwartungshorizont die Aufgaben-IDs und Maximalpunkte pro Aufgabe herauslesen.
 *
 * Warum: Die Maximalpunkte einer Klausur sind ein Attribut DER KLAUSUR, nicht
 * einzelner Schülerarbeiten. Der Haupt-Analysecall leitet maxPoints aus dem
 * ab, was die KI in der Schülerklausur findet — das schwankt aber (OCR-Lücken,
 * differenzierte Versionen, leere Antworten). Mit dieser Struktur haben wir
 * einen stabilen Wahrheitsanker.
 */
export const STRUCTURE_EXTRACT_SYSTEM_PROMPT = `Du bist ein präziser Parser für
schulische Erwartungshorizonte. Du extrahierst ausschließlich die Aufgaben-
Struktur mit Maximalpunkten. Du antwortest NUR mit gültigem JSON.`;

export function buildStructureExtractPrompt(erwartungshorizont: string): string {
  return `Extrahiere aus dem folgenden Erwartungshorizont die Aufgaben-Struktur
und gib sie als JSON zurück. Schema:

{
  "tasks": [
    { "taskId": "1", "taskTitle": "Aufgabe 1", "maxPoints": 6 },
    { "taskId": "2a", "taskTitle": "Aufgabe 2a", "maxPoints": 4 }
  ],
  "totalMaxPoints": 10
}

REGELN:
- "taskId": kurze Kennung wie "1", "1a", "2.1" (so wie im Erwartungshorizont steht).
- "taskTitle": kurze Bezeichnung, z. B. "Aufgabe 1", "Aufgabe 2a" oder der Aufgabentitel wenn vorhanden.
- "maxPoints": Zahl (nicht String). Die im Erwartungshorizont vergebenen Maximalpunkte pro Aufgabe.
- "totalMaxPoints": Zahl. Summe aller maxPoints.
- Erfinde NICHTS. Wenn keine Punktangabe erkennbar ist, lasse die Aufgabe weg.
- Zähle Teilaufgaben (1a, 1b, …) einzeln, wenn sie einzeln mit Punkten versehen sind.
- Zähle NUR Aufgaben mit expliziter Punkteangabe.
- Antworte ausschließlich mit dem JSON, keine Erläuterung.

ERWARTUNGSHORIZONT:
${erwartungshorizont}`;
}
