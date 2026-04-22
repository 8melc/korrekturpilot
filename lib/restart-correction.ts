import type { CourseInfo } from '@/types/results'

export const RESTART_CORRECTION_STORAGE_KEY = 'correctionpilot-restart-correction'

export interface RestartCorrectionPayload {
  id: string
  fileName: string
  fileKey: string
  expectationKey: string
  expectationFileName?: string | null
  course: CourseInfo
}
