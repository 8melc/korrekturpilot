import { getOpenAIClient } from '../openai';
import {
  STRUCTURE_EXTRACT_SYSTEM_PROMPT,
  buildStructureExtractPrompt,
} from './prompts/structure-extract-prompt';

export interface KlausurTaskStructure {
  taskId: string;
  taskTitle: string;
  maxPoints: number;
}

export interface KlausurStructure {
  tasks: KlausurTaskStructure[];
  totalMaxPoints: number;
}

/**
 * Extrahiert die Aufgaben-Struktur (IDs + maxPoints) aus einem Erwartungshorizont.
 *
 * Verwendet einen kleinen GPT-4o-mini-Call. Deterministisch via Seed.
 * Bei Fehler: null — Aufrufer soll auf Fallback (KI-Summe aus Schülerklausur) zurückfallen.
 */
export async function extractKlausurStructure(
  erwartungshorizont: string,
  seed?: number,
): Promise<KlausurStructure | null> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STRUCTURE_EXTRACT_SYSTEM_PROMPT },
        { role: 'user', content: buildStructureExtractPrompt(erwartungshorizont) },
      ],
      temperature: 0.0,
      top_p: 0.1,
      ...(typeof seed === 'number' ? { seed } : {}),
      response_format: { type: 'json_object' },
      max_tokens: 2048,
    });

    if (response.usage) {
      console.log('[Token-Usage] Struktur-Extraktion:', {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        seed: typeof seed === 'number' ? seed : 'none',
      });
    }

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return normalizeExtractedStructure(parsed);
  } catch (error) {
    console.warn('[Struktur-Extraktion] Fehler, fallback auf KI-Summe:', error);
    return null;
  }
}

export function normalizeExtractedStructure(parsed: unknown): KlausurStructure | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as { tasks?: unknown; totalMaxPoints?: unknown };

  if (!Array.isArray(obj.tasks)) return null;

  const tasks: KlausurTaskStructure[] = [];
  for (const entry of obj.tasks) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as { taskId?: unknown; taskTitle?: unknown; maxPoints?: unknown };

    const taskId = typeof e.taskId === 'string' ? e.taskId.trim() : '';
    if (!taskId) continue;

    const maxPoints = typeof e.maxPoints === 'number' && Number.isFinite(e.maxPoints) && e.maxPoints > 0
      ? Math.round(e.maxPoints)
      : null;
    if (maxPoints === null) continue;

    const taskTitle = typeof e.taskTitle === 'string' && e.taskTitle.trim()
      ? e.taskTitle.trim()
      : `Aufgabe ${taskId}`;

    tasks.push({ taskId, taskTitle, maxPoints });
  }

  if (tasks.length === 0) return null;

  const summed = tasks.reduce((acc, t) => acc + t.maxPoints, 0);
  const totalMaxPoints =
    typeof obj.totalMaxPoints === 'number' && Number.isFinite(obj.totalMaxPoints) && obj.totalMaxPoints > 0
      ? Math.round(obj.totalMaxPoints)
      : summed;

  // Wenn totalMaxPoints stark von der Summe abweicht, bevorzuge die Summe
  // (die ist nachvollziehbar pro Aufgabe — totalMaxPoints kann geschätzt sein).
  const finalTotal = Math.abs(totalMaxPoints - summed) > 2 ? summed : totalMaxPoints;

  return { tasks, totalMaxPoints: finalTotal };
}
