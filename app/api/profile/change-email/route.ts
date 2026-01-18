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
    const { newEmail, password } = body;

    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'Neue E-Mail-Adresse und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Prüfe, ob die neue E-Mail sich von der aktuellen unterscheidet
    if (newEmail === user.email) {
      return NextResponse.json(
        { error: 'Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Prüfe zuerst, ob das Passwort korrekt ist, indem wir versuchen, uns anzumelden
    // Dies ist notwendig, um die Identität des Benutzers zu bestätigen
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Falsches Passwort. Bitte versuche es erneut.' },
        { status: 401 }
      );
    }

    // Wenn die Anmeldung erfolgreich war, aktualisiere die E-Mail-Adresse
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      console.error('Error updating email:', error);
      
      // Spezifische Fehlermeldungen
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits verwendet' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Fehler beim Ändern der E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Supabase sendet automatisch eine Bestätigungs-E-Mail an die neue Adresse
    return NextResponse.json({ 
      success: true,
      message: 'E-Mail-Adresse wurde aktualisiert. Bitte prüfe dein Postfach und bestätige die neue E-Mail-Adresse.' 
    });
  } catch (error) {
    console.error('Error in email change:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}








