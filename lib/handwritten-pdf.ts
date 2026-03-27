import { GoogleGenerativeAI } from '@google/generative-ai';

export async function extractHandwrittenPdfText(uint8: Uint8Array): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    throw new Error('Google AI Key nicht konfiguriert');
  }

  try {
    console.log('Starte Handschrift-Extraktion mit Gemini...');
    console.log('GOOGLE_AI_KEY vorhanden:', apiKey ? `${apiKey.substring(0, 8)}...` : 'FEHLT');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(uint8).toString('base64'),
          mimeType: 'application/pdf'
        }
      },
      `Transkribiere den gesamten handgeschriebenen Text aus diesem PDF. Behalte die Struktur bei (Aufgabennummern, Absätze).

⚠️ WICHTIG FÜR CHEMISCHE STRUKTURFORMELN:

Diese Klausur kann HANDGEZEICHNETE chemische Strukturformeln enthalten.

Strukturformeln sind als LINIEN, STRICHE und BUCHSTABEN (C, H, O, OH) gezeichnet.

Die Zeichnungen sind auf KARIERTEM PAPIER, oft mit BLEISTIFT/Kugelschreiber.

Strukturformeln können UNORDENTLICH oder UNLESERLICH sein - beschreibe trotzdem was du siehst!

OH-Gruppen sind oft EINGEKREIST oder markiert.

Achte auf:
- C-C Bindungen (Linien zwischen Kohlenstoffatomen)
- OH-Gruppen (oft eingekreist oder markiert)
- Kettenlänge (Anzahl C-Atome)
- Buchstaben wie C, H, O, OH
- Eingekreiste oder markierte Bereiche

Wenn du IRGENDEINE Struktur erkennst, beschreibe sie detailliert:
- "Strukturformel mit X Kohlenstoffatomen"
- "OH-Gruppe am Ende/am Anfang"
- "Eingekreiste OH-Gruppe"
- "Linien zwischen Atomen erkennbar"

Beschreibe auch unleserliche Strukturen, wenn du die Grundform erkennst.

Gib nur den reinen Text zurück, aber beschreibe ALLE Zeichnungen und Strukturen die du siehst.`
    ]);

    const text = result.response.text();
    console.log('Handschrift-Extraktion abgeschlossen:', text.length, 'Zeichen');
    return text;

  } catch (err) {
    console.error('Handschrift-Extraktion error:', err);
    throw new Error(`Handschrift-Extraktion fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
  }
}