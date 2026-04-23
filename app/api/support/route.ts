import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { validateSupportRequest } from '@/lib/support';
import { sendSupportNotification } from '@/lib/support-mailer';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateSupportRequest(body);

    if (!validation.ok || !validation.data) {
      return NextResponse.json({ error: validation.error || 'Ungültige Anfrage.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('support_requests')
      .insert({
        user_id: user.id,
        request_type: validation.data.requestType,
        product_area: validation.data.productArea,
        subject: validation.data.subject,
        actual_behavior: validation.data.actualBehavior,
        expected_behavior: validation.data.expectedBehavior,
        reproduction_steps: validation.data.reproductionSteps,
        related_correction_id: validation.data.relatedCorrectionId,
        related_file_name: validation.data.relatedFileName,
        device_context: validation.data.deviceContext,
        screenshot_available: validation.data.screenshotAvailable,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating support request:', error);
      return NextResponse.json({ error: 'Die Anfrage konnte nicht gespeichert werden.' }, { status: 500 });
    }

    try {
      await sendSupportNotification({
        requestId: data.id,
        userId: user.id,
        userEmail: user.email ?? null,
        payload: validation.data,
      });
    } catch (mailError) {
      console.error('Error sending support notification email:', mailError);
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error in POST /api/support:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
