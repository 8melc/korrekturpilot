import { getGradeInfo } from '@/lib/grades'
import type { KlausurAnalyse } from '@/lib/openai'
import type { CourseInfo } from '@/types/results'
import { mapToParsedAnalysis } from '@/types/analysis'

export interface ManualOverrideTaskDraft {
  taskId: string
  taskTitle: string
  sourceLabel: string
  maxPunkte: number
  erreichtePunkte: number
  whatIsCorrectText: string
  whatIsWrongText: string
  improvementTipsText: string
  correctionsText: string
}

export interface ManualOverrideDraft {
  summary: string
  gesamtpunkte: number
  erreichtePunkte: number
  prozent: number
  note: string
  tasks: ManualOverrideTaskDraft[]
}

function toTextarea(items: string[]): string {
  return items.join('\n')
}

function fromTextarea(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function clampPoints(value: number, maxPoints: number): number {
  if (!Number.isFinite(value)) return 0
  const normalized = Math.round(value)
  return Math.min(Math.max(normalized, 0), Math.max(maxPoints, 0))
}

function buildTaskLabel(taskId: string, taskTitle: string, fallback: string): string {
  const cleanTitle = taskTitle.trim()
  if (!cleanTitle) return fallback
  return taskId ? `${taskId}: ${cleanTitle}` : cleanTitle
}

function buildKommentar(task: ManualOverrideTaskDraft): string {
  const sections: string[] = []
  const correct = fromTextarea(task.whatIsCorrectText)
  const wrong = fromTextarea(task.whatIsWrongText)
  const improvements = fromTextarea(task.improvementTipsText)

  if (correct.length > 0) {
    sections.push(`DAS WAR RICHTIG:\n${correct.map((item) => `• ${item}`).join('\n')}`)
  }
  if (wrong.length > 0) {
    sections.push(`HIER GAB ES ABZÜGE:\n${wrong.map((item) => `• ${item}`).join('\n')}`)
  }
  if (improvements.length > 0) {
    sections.push(`VERBESSERUNGSTIPP:\n${improvements.map((item) => `• ${item}`).join('\n')}`)
  }

  return sections.join('\n\n')
}

export function recalculateManualOverrideDraft(
  draft: ManualOverrideDraft,
  course: CourseInfo
): ManualOverrideDraft {
  const tasks = draft.tasks.map((task) => ({
    ...task,
    taskTitle: task.taskTitle.trim(),
    maxPunkte: clampPoints(task.maxPunkte, Number.MAX_SAFE_INTEGER),
    erreichtePunkte: clampPoints(task.erreichtePunkte, task.maxPunkte),
    whatIsCorrectText: task.whatIsCorrectText,
    whatIsWrongText: task.whatIsWrongText,
    improvementTipsText: task.improvementTipsText,
    correctionsText: task.correctionsText,
  }))

  const gesamtpunkte = tasks.reduce((sum, task) => sum + task.maxPunkte, 0)
  const erreichtePunkte = tasks.reduce((sum, task) => sum + task.erreichtePunkte, 0)
  const prozent = gesamtpunkte > 0 ? Math.round((erreichtePunkte / gesamtpunkte) * 100) : 0
  const gradeLevel = course.gradeLevel ? parseInt(course.gradeLevel, 10) || 10 : 10
  const note = getGradeInfo({ prozent, gradeLevel }).label

  return {
    ...draft,
    tasks,
    summary: draft.summary,
    gesamtpunkte,
    erreichtePunkte,
    prozent,
    note,
  }
}

export function createManualOverrideDraft(
  analysis: KlausurAnalyse,
  course: CourseInfo
): ManualOverrideDraft {
  const gradeLevel = course.gradeLevel ? parseInt(course.gradeLevel, 10) || 10 : 10
  const parsed = mapToParsedAnalysis(
    analysis,
    getGradeInfo({ prozent: analysis.prozent, gradeLevel }).label
  )

  return recalculateManualOverrideDraft(
    {
      summary: parsed.summary || analysis.zusammenfassung || '',
      gesamtpunkte: parsed.gesamtpunkte,
      erreichtePunkte: parsed.erreichtePunkte,
      prozent: Math.round(parsed.prozent),
      note: parsed.note,
      tasks: parsed.aufgaben.map((task, index) => ({
        taskId: task.taskId,
        taskTitle: task.taskTitle,
        sourceLabel: analysis.aufgaben[index]?.aufgabe || buildTaskLabel(task.taskId, task.taskTitle, task.taskTitle),
        maxPunkte: task.maxPunkte,
        erreichtePunkte: task.erreichtePunkte,
        whatIsCorrectText: toTextarea(task.whatIsCorrect),
        whatIsWrongText: toTextarea(task.whatIsWrong),
        improvementTipsText: toTextarea(task.improvementTips),
        correctionsText: toTextarea(task.korrekturen || []),
      })),
    },
    course
  )
}

export function applyManualOverride(
  original: KlausurAnalyse,
  draft: ManualOverrideDraft,
  course: CourseInfo
): KlausurAnalyse {
  const recalculated = recalculateManualOverrideDraft(draft, course)
  const previousVersion =
    typeof original._manualOverride?.version === 'number'
      ? original._manualOverride.version
      : 0

  return {
    ...original,
    gesamtpunkte: recalculated.gesamtpunkte,
    erreichtePunkte: recalculated.erreichtePunkte,
    prozent: recalculated.prozent,
    zusammenfassung: recalculated.summary.trim(),
    aufgaben: recalculated.tasks.map((task) => ({
      aufgabe: buildTaskLabel(task.taskId, task.taskTitle, task.sourceLabel),
      maxPunkte: task.maxPunkte,
      erreichtePunkte: task.erreichtePunkte,
      kommentar: buildKommentar(task),
      korrekturen: fromTextarea(task.correctionsText),
    })),
    _manualOverride: {
      edited: true,
      editedAt: new Date().toISOString(),
      version: previousVersion + 1,
    },
  }
}
