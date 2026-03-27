import { GoogleGenerativeAI } from '@google/generative-ai';

export async function extractPdfText(uint8: Uint8Array): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    throw new Error('Google AI Key nicht konfiguriert');
  }

  try {
    console.log('Starte PDF-Extraktion mit Gemini...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(uint8).toString('base64'),
          mimeType: 'application/pdf'
        }
      },
      'Extrahiere den gesamten Text aus diesem PDF-Dokument. Behalte die Struktur bei. Gib nur den reinen Text zurück.'
    ]);

    const text = result.response.text();
    console.log('PDF-Extraktion abgeschlossen:', text.length, 'Zeichen');
    return text;

  } catch (err) {
    console.error('PDF-Extraktion error:', err);
    throw new Error(`PDF-Textextraktion fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
  }
}