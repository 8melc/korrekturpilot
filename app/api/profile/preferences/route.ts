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
    const { 
      feedback_style, 
      feedback_length, 
      use_formal_address,
      email_correction_finished,
      email_credits_low,
      email_weekly_summary,
      email_feature_updates,
    } = body;

    const supabase = await createClient();

    // Update user_profile
    const { error: profileError } = await supabase
      .from('user_profile')
      .upsert({
        id: user.id,
        feedback_style,
        feedback_length,
        use_formal_address,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('Error updating profile preferences:', profileError);
    }

    // Update email_preferences
    const { error: emailError } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: user.id,
        correction_finished: email_correction_finished,
        credits_low: email_credits_low,
        weekly_summary: email_weekly_summary,
        feature_updates: email_feature_updates,
      }, {
        onConflict: 'user_id',
      });

    if (emailError) {
      console.error('Error updating email preferences:', emailError);
    }

    if (profileError || emailError) {
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Präferenzen' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in preferences update:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}







