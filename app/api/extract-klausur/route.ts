import { NextRequest, NextResponse } from 'next/server';
import { extractHandwrittenPdfText } from '@/lib/handwritten-pdf';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

// WICHTIG: Node.js Runtime für größere Dateien
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Lese JSON-Body mit fileKey
    const body = await request.json();
    const { fileKey } = body;

    if (!fileKey) {
      console.error('Kein fileKey im Request-Body gefunden');
      return NextResponse.json(
        { error: 'fileKey ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe, ob fileKey mit user.id/ beginnt (Sicherheit)
    if (!fileKey.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: 'Zugriff verweigert — diese Datei gehört einem anderen Benutzer' },
        { status: 403 }
      );
    }

    console.log('Datei-Key empfangen:', fileKey);

    // Lade Datei aus Supabase Storage
    const supabase = createClientFromRequest(request);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('klausuren')
      .download(fileKey);

    if (downloadError || !fileData) {
      console.error('Fehler beim Laden der Datei aus Supabase Storage:', downloadError);
      
      // Spezielle Behandlung für 403-Fehler (RLS etc.)
      const errorStatus = (downloadError as any)?.status;
      const errorMessage = (downloadError as any)?.message ?? '';

      if (errorStatus === 403 || errorMessage.includes('row-level security')) {
        return NextResponse.json(
          { error: 'Zugriff verweigert — diese Datei gehört einem anderen Benutzer' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: `Fehler beim Laden der Datei: ${downloadError?.message || 'Unbekannter Fehler'}` },
        { status: 500 }
      );
    }

    // Konvertiere Blob zu Uint8Array
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    if (uint8.length === 0) {
      return NextResponse.json({ error: 'Leere Datei' }, { status: 400 });
    }

    console.log(`[${fileKey}] Datei geladen, Größe:`, uint8.length, 'bytes');
    console.log(`[${fileKey}] Starte Handschrift-Extraktion mit Gemini...`);
    const text = await extractHandwrittenPdfText(uint8);

    if (!text || text.trim().length === 0) {
      const fileName = fileKey.split('/').pop() || fileKey;
      console.warn(`[${fileKey}] Kein Text extrahiert - PDF könnte leer oder nicht lesbar sein`);
      return NextResponse.json(
        {
          error: 'Kein Text aus PDF extrahiert. Die Datei könnte leer, beschädigt oder nicht lesbar sein.',
          text: '',
          filename: fileName,
          size: uint8.length,
        },
        { status: 422 }
      );
    }

    console.log(`[${fileKey}] Handschrift-Extraktion erfolgreich:`, text.length, 'Zeichen');

    // Extrahiere Dateinamen aus fileKey (letzter Teil nach dem letzten /)
    const fileName = fileKey.split('/').pop() || fileKey;

    return NextResponse.json(
      {
        text,
        filename: fileName,
        size: uint8.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Extract-Klausur API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    // Spezielle Behandlung für Timeout-Fehler
    if (errorMessage.toLowerCase().includes('timeout')) {
      return NextResponse.json(
        {
          error:
            'Die Analyse hat zu lange gedauert und wurde abgebrochen. Bitte versuche es mit einer kleineren oder kürzeren Klausur erneut.',
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'Fehler bei der Extraktion der Klausur.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
