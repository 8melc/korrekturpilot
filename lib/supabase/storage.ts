const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET_NAME = 'klausuren'; // deinen Bucket-Namen hier eintragen

export function getPublicPdfUrl(fileKey: string | null | undefined) {
  if (!fileKey) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileKey}`;
}




