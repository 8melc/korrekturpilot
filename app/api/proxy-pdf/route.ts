import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

// WICHTIG: Node.js Runtime für größere Dateien
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Auth-Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Lese fileKey aus Query-Parameter
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey');

    if (!fileKey) {
      return NextResponse.json(
        { error: 'fileKey Query-Parameter ist erforderlich' },
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

    // Lade PDF aus Supabase Storage
    const supabase = createClientFromRequest(request);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('klausuren')
      .download(fileKey);

    if (downloadError || !fileData) {
      console.error('Fehler beim Laden der PDF aus Supabase Storage:', downloadError);
      
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
        { status: 404 }
      );
    }

    // Konvertiere Blob zu ArrayBuffer für Response
    const arrayBuffer = await fileData.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'Leere Datei' },
        { status: 400 }
      );
    }

    // Gibt PDF mit korrektem Content-Type zurück
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileKey.split('/').pop() || 'document.pdf'}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Proxy-PDF API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    return NextResponse.json(
      {
        error: 'Fehler beim Laden der PDF-Datei.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}



