import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StoredResultEntry } from '@/types/results';

export function useCorrections() {
  const [results, setResults] = useState<StoredResultEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setResults([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('corrections')
      .select(`
        id,
        student_name,
        file_name,
        course_subject,
        course_grade_level,
        course_class_name,
        course_school_year,
        status,
        analysis,
        file_key,
        expectation_key
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setResults([]);
      setLoading(false);
      return;
    }

    const filtered = (data ?? []).filter(
      (row: any) => row.status === 'completed' || row.status === 'error'
    );

    const mapped: StoredResultEntry[] = filtered.map((row: any) => ({
      id: row.id,
      studentName: row.student_name,
      fileName: row.file_name,
      status:
        row.status === 'completed'
          ? 'Bereit'
          : row.status === 'processing' || row.status === 'pending'
          ? 'Analyse läuft…'
          : 'Fehler',
      analysis: row.analysis,
      course: {
        subject: row.course_subject ?? '–',
        gradeLevel: row.course_grade_level ?? '–',
        className: row.course_class_name ?? '–',
        schoolYear: row.course_school_year ?? 'Nicht angegeben',
      },
      // NEU: Keys aus DB
      fileUrl: row.file_key,
      expectationUrl: row.expectation_key,
      // Kompatibilität zu DetailDrawer/PDFViewer
      klausurFileKey: row.file_key,
      expectationFileKey: row.expectation_key,
    }));

    setResults(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { results, loading, reload: load };
}

