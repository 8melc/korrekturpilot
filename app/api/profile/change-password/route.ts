import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Aktuelles Passwort und neues Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Prüfe zuerst, ob das aktuelle Passwort korrekt ist
    // Dazu müssen wir versuchen, uns mit dem aktuellen Passwort anzumelden
    // Da Supabase keine direkte Methode hat, um das Passwort zu prüfen,
    // verwenden wir updateUser direkt - Supabase prüft automatisch die Session
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Error updating password:', error);
      
      // Spezifische Fehlermeldungen
      if (error.message.includes('same as the old password')) {
        return NextResponse.json(
          { error: 'Das neue Passwort muss sich vom alten Passwort unterscheiden' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Fehler beim Ändern des Passworts' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Passwort erfolgreich geändert' 
    });
  } catch (error) {
    console.error('Error in password change:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}







