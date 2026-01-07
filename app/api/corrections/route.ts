import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { executeWithRetry, isJWTExpiredError } from '@/lib/supabase/error-handler';
import type { CourseInfo, ResultStatus } from '@/types/results';
import type { KlausurAnalyse } from '@/lib/openai';

function mapStatusToDb(status: ResultStatus): string {
  switch (status) {
    case 'Analyse läuft…':
      return 'processing';
    case 'Bereit':
      return 'completed';
    case 'Fehler':
      return 'error';
    default:
      return 'pending';
  }
}

interface SaveCorrectionRequest {
  id: string;
  studentName: string;
  fileName: string;
  course: CourseInfo;
  status: ResultStatus;
  analysis?: KlausurAnalyse;
  fileUrl?: string | null;
  expectationUrl?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body: SaveCorrectionRequest = await request.json();
    const userId = user.id;

    type CorrectionRow = { id: string };
    const { data: existing, error: queryError } = await executeWithRetry<CorrectionRow>(
      async (client) => {
        const sb = client ?? supabase;
        return await sb
          .from('corrections')
          .select('id')
          .eq('user_id', userId)
          .eq('id', body.id)
          .maybeSingle();
      },
      supabase
    );

    if (queryError) {
      if (isJWTExpiredError(queryError)) {
        return NextResponse.json(
          { error: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' },
          { status: 401 }
        );
      }
      console.error('Supabase query error:', queryError);
      return NextResponse.json({ error: 'Fehler beim Laden der Korrektur' }, { status: 500 });
    }

    if (existing) {
      const { error } = await executeWithRetry(
        async (client) => {
          const sb = client ?? supabase;
          return await sb
            .from('corrections')
            .update({
              student_name: body.studentName,
              file_name: body.fileName,
              course_subject: body.course.subject,
              course_grade_level: body.course.gradeLevel,
              course_class_name: body.course.className,
              course_school_year: body.course.schoolYear,
              status: mapStatusToDb(body.status),
              analysis: body.analysis ?? null,
              file_key: body.fileUrl ?? null,
              expectation_key: body.expectationUrl ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', body.id)
            .eq('user_id', userId)
            .select();
        },
        supabase
      );

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
    } else {
      const { error } = await executeWithRetry(
        async (client) => {
          const sb = client ?? supabase;
          return await sb.from('corrections').insert({
            id: body.id,
            user_id: userId,
            student_name: body.studentName,
            file_name: body.fileName,
            course_subject: body.course.subject,
            course_grade_level: body.course.gradeLevel,
            course_class_name: body.course.className,
            course_school_year: body.course.schoolYear,
            status: mapStatusToDb(body.status),
            analysis: body.analysis ?? null,
            file_key: body.fileUrl ?? null,
            expectation_key: body.expectationUrl ?? null,
          });
        },
        supabase
      );

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving correction:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Korrektur', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, deleteAll } = body as { id?: string; deleteAll?: boolean };

    if (deleteAll) {
      const { data, error } = await supabase
        .from('corrections')
        .delete()
        .eq('user_id', user.id)
        .select('id');

      if (error) {
        console.error('DELETE /api/corrections deleteAll error', error);
        return NextResponse.json({ error: 'Delete all failed' }, { status: 500 });
      }

      const deletedCount = data?.length ?? 0;
      return NextResponse.json({ success: true, deletedCount });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('corrections')
      .delete()
      .match({ id, user_id: user.id })
      .select('id');

    if (error) {
      console.error('DELETE /api/corrections single delete error', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    const deletedCount = data?.length ?? 0;
    if (deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error: any) {
    console.error('Error deleting correction(s):', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Korrektur(en)', details: error?.message },
      { status: 500 }
    );
  }
}
