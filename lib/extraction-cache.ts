const EXTRACTION_CACHE_KEY = 'correctionpilot-extraction-cache-v1';
const MAX_EXTRACTION_CACHE_ENTRIES = 50;

export interface ExtractionCacheEntry {
  fileHash: string;
  fileName: string;
  text: string;
  textHash: string;
  updatedAt: string;
}

function readCache(): ExtractionCacheEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(EXTRACTION_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Fehler beim Lesen des Extraktions-Caches:', error);
    return [];
  }
}

function writeCache(entries: ExtractionCacheEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EXTRACTION_CACHE_KEY, JSON.stringify(entries));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashBrowserFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufferToHex(digest);
}

export function getCachedExtraction(fileHash: string): ExtractionCacheEntry | null {
  if (!fileHash) return null;
  const entries = readCache();
  return entries.find((entry) => entry.fileHash === fileHash) ?? null;
}

export function storeCachedExtraction(entry: ExtractionCacheEntry) {
  const existing = readCache().filter((item) => item.fileHash !== entry.fileHash);
  existing.unshift(entry);
  writeCache(existing.slice(0, MAX_EXTRACTION_CACHE_ENTRIES));
}
