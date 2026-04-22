'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import UploadBox from '@/components/UploadBox'
import CourseSelectionCard from '@/components/CourseSelectionCard'
import UploadedFilesList from '@/components/UploadedFilesList'
import UploadProgressList from '@/components/UploadProgressList'
import AnalysisStartSection from '@/components/AnalysisStartSection'
import ProtectedRoute from '@/components/ProtectedRoute'

import { useUploadQueue } from '@/hooks/useUploadQueue'
import { useAnalysisQueue } from '@/hooks/useAnalysisQueue'

import type { UploadedFile } from '@/components/UploadBox'
import type { CourseInfo } from '@/types/results'
import { getCurrentSchoolYear } from '@/lib/school-year'
import {
  getCachedExtraction,
  hashBrowserFile,
  storeCachedExtraction,
} from '@/lib/extraction-cache'
import {
  getUserFacingErrorMessage,
  normalizeStatusError,
  readApiErrorMessage,
} from '@/lib/user-facing-errors'
import {
  RESTART_CORRECTION_STORAGE_KEY,
  type RestartCorrectionPayload,
} from '@/lib/restart-correction'
import {
  mergeAnalysisInternal,
  OCR_INTERNAL_VERSION,
  stripAnalysisForLocalCache,
} from '@/lib/analysis-internal'

const SUBJECT_OPTIONS = ['Mathematik', 'Deutsch', 'Englisch', 'Französisch', 'Spanisch', 'Latein', 'Chemie', 'Physik', 'Biologie', 'Geschichte', 'Geographie', 'Politik', 'Wirtschaft', 'Philosophie', 'Kunst', 'Musik', 'Sport', 'Informatik', 'Sonstiges']
const GRADE_OPTIONS = ['5', '6', '7', '8', '9', '10', '11', '12', '13']
const CLASS_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'GK', 'LK']

const STORAGE_KEY = 'correctionpilot-results'

interface StoredResultEntry {
  id: string
  status: string
  analysis: any
  gesamtpunkte: number
  erreichtePunkte: number
  prozent: number
  zusammenfassung?: string
}

const readResults = (): Array<{ id: string; fileName: string; status: string }> => {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: any) => ({
      id: item.id || '',
      fileName: item.fileName || '',
      status: item.status || ''
    }))
  } catch (error) {
    console.error('Fehler beim Lesen der Ergebnisse:', error)
    return []
  }
}

const getStoredResult = (correctionId: string): { analysis: any } | null => {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const entry = parsed.find((item: any) => item.id === correctionId && item.status === 'Bereit')
    if (entry && entry.analysis) {
      return { analysis: entry.analysis }
    }
    return null
  } catch (error) {
    console.error('Fehler beim Lesen des gespeicherten Ergebnisses:', error)
    return null
  }
}

const updateStorageEntry = (id: string, patch: Partial<StoredResultEntry>) => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return
  const list: StoredResultEntry[] = JSON.parse(stored)
  const next = list.map(item => item.id === id ? { ...item, ...patch } : item)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

const removeStorageEntry = (id: string) => {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return
  const list: StoredResultEntry[] = JSON.parse(stored)
  const next = list.filter(item => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

const appendToStorage = (entry: { id: string; studentName: string; status: string; fileName: string; course: CourseInfo; analysis?: any }) => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const list: any[] = stored ? JSON.parse(stored) : []
  const existingIndex = list.findIndex(item => item.id === entry.id)
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...entry }
  } else {
    list.push(entry)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

interface StepIndicatorProps {
  stepNumber: number
  isComplete: boolean
  isCurrent: boolean
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ stepNumber, isComplete, isCurrent }) => {
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.875rem',
        fontWeight: 600,
        border: '2px solid',
        borderColor: isComplete ? 'var(--color-success)' : isCurrent ? 'var(--color-primary)' : 'var(--color-gray-300)',
        backgroundColor: isComplete ? 'var(--color-success)' : isCurrent ? 'var(--color-primary-light)' : 'transparent',
        color: isComplete ? 'white' : isCurrent ? 'var(--color-primary)' : 'var(--color-gray-500)',
        transition: 'all 0.3s ease',
        flexShrink: 0
      }}
    >
      {isComplete ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        stepNumber
      )}
    </div>
  )
}

export default function CorrectionPage() {
  const [course, setCourse] = useState<CourseInfo>({ subject: '', gradeLevel: '', className: '', schoolYear: '' })
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [expectationFileName, setExpectationFileName] = useState<string | null>(null)
  const [expectationFileKey, setExpectationFileKey] = useState<string | null>(null)
  const [expectationText, setExpectationText] = useState<string | null>(null)
  const [expectationFileHash, setExpectationFileHash] = useState<string | null>(null)
  const [expectationTextHash, setExpectationTextHash] = useState<string | null>(null)
  const [expectationError, setExpectationError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [flowErrorMessage, setFlowErrorMessage] = useState<string | null>(null)
  const [blinkingField, setBlinkingField] = useState<keyof CourseInfo | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAcceptedDataPrivacy, setHasAcceptedDataPrivacy] = useState(false)
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState<string | null>(null)
  const [reanalysisDecisions, setReanalysisDecisions] = useState<Record<string, 'reanalyze' | 'skip' | undefined>>({})
  const [isLoaded, setIsLoaded] = useState(false)

  // ============================================================================
  // LAYER 1: SESSION-BASED IDEMPOTENCY GUARD
  // Tracks ALL file IDs that have been processed in this session
  // ============================================================================
  const processedFilesRef = useRef<Set<string>>(new Set())
  
  // Separate tracking for queued analyses (prevents double-queueing)
  const queuedAnalysesRef = useRef<Set<string>>(new Set())
  
  // Tracks files that have completed saving (prevents double-save)
  const savedCorrectionsRef = useRef<Set<string>>(new Set())
  const batchOutcomeHandledRef = useRef(false)
  const surfacedUploadErrorKeysRef = useRef<Set<string>>(new Set())
  const reanalysisDecisionsRef = useRef<Record<string, 'reanalyze' | 'skip' | undefined>>({})
  const pendingRestartAutostartRef = useRef<RestartCorrectionPayload | null>(null)
  

  const isCourseComplete = Boolean(course.subject && course.gradeLevel && course.className && course.schoolYear)
  const alreadyAnalyzedUploadIds = new Set(
    uploads
      .filter((file) =>
        !file.forceReanalysis &&
        readResults().some((result) => result.fileName === file.fileName && result.status === 'Bereit')
      )
      .map((file) => file.id)
  )
  const selectedReanalysisCount = Object.entries(reanalysisDecisions).filter(
    ([id, decision]) => alreadyAnalyzedUploadIds.has(id) && decision === 'reanalyze'
  ).length
  const unresolvedReanalysisCount = Array.from(alreadyAnalyzedUploadIds).filter(
    (id) => !reanalysisDecisions[id]
  ).length

  // Load results on mount and mark completed files
  useEffect(() => {
    const loadedResults = readResults()
    
    // Mark all finished results in savedCorrectionsRef
    loadedResults.forEach((result) => {
      if (result.status === 'Bereit' && result.id) {
        savedCorrectionsRef.current.add(result.id)
        // CRITICAL: Also mark in processedFilesRef to prevent re-queueing
        processedFilesRef.current.add(result.id)
        console.log(`[Init] ${result.fileName} (ID: ${result.id}) bereits fertig - in Guards markiert.`)
      }
    })
    
    setIsLoaded(true)
  }, [])

  // Load course data from localStorage (client-only)
  useEffect(() => {
    const stored = localStorage.getItem('courseContext')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setCourse({ subject: parsed.subject || '', gradeLevel: parsed.gradeLevel || '', className: parsed.className || '', schoolYear: parsed.schoolYear || getCurrentSchoolYear() })
      } catch {
        setCourse(prev => ({ ...prev, schoolYear: getCurrentSchoolYear() }))
      }
    } else {
      setCourse(prev => ({ ...prev, schoolYear: getCurrentSchoolYear() }))
    }
  }, [])

  const handleCourseChange = (field: keyof CourseInfo, value: string) => {
    const next = { ...course, [field]: value }
    setCourse(next)
    localStorage.setItem('courseContext', JSON.stringify(next))
    
    if (blinkingField === field) setBlinkingField(null)
    if (next.subject && next.gradeLevel && next.className && next.schoolYear) setErrorMessage(null)
  }

  const handleDisabledUploadClick = () => {
    const step1Element = document.getElementById('step-1-kursdaten')
    step1Element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    if (!course.subject) setBlinkingField('subject')
    else if (!course.gradeLevel) setBlinkingField('gradeLevel')
    else if (!course.className) setBlinkingField('className')
    else if (!course.schoolYear) setBlinkingField('schoolYear')
    
    setErrorMessage('Bitte vervollständige zuerst die Kursdaten in Schritt 1.')
    setTimeout(() => setBlinkingField(null), 2000)
  }

  const handleDisabledStepClick = (stepNumber: number) => {
    if (!isCourseComplete) {
      handleDisabledUploadClick()
    } else if (stepNumber >= 3 && !expectationText) {
      const step2Element = document.querySelector('[id*="step-2"]') || document.querySelector('input[type="file"]')?.closest('.process-card')
      step2Element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const message = expectationError
        ? 'Der Erwartungshorizont in Schritt 2 konnte nicht verarbeitet werden. Bitte behebe zuerst diesen Fehler.'
        : 'Bitte lade zuerst einen gültigen Erwartungshorizont in Schritt 2 hoch.'
      setErrorMessage(message)
      setTimeout(() => setErrorMessage(null), 4000)
    } else if (stepNumber === 4 && !hasAcceptedDataPrivacy) {
      const step3Element = document.querySelector('[id*="step-3"]') || document.querySelector('input#privacy-consent')?.closest('.process-card')
      step3Element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setErrorMessage('Bitte bestätige zuerst die Datenschutz-Checkliste in Schritt 3.')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleExpectationUpload = async (files: UploadedFile[]) => {
    if (!files.length) return
    const file = files[0]
    if (!file.file) {
      toast.error('Der Erwartungshorizont muss als neue PDF hochgeladen werden.')
      return
    }
    setExpectationError(null)
    setFlowErrorMessage(null)
    setErrorMessage(null)

    try {
      const localFileHash = await hashBrowserFile(file.file)
      const fileKey = await uploadFileToStorage(file.file)
      const cachedExtraction = getCachedExtraction(localFileHash)

      let extractedText: string
      let extractedTextHash: string | null
      let resolvedFileHash = localFileHash

      if (cachedExtraction) {
        extractedText = cachedExtraction.text
        extractedTextHash = cachedExtraction.textHash
      } else {
        const extractResponse = await fetch('/api/extract-klausur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey })
        })

        if (!extractResponse.ok) {
          throw new Error(
            await readApiErrorMessage(
              extractResponse,
              'Der Erwartungshorizont konnte nicht verarbeitet werden. Bitte lade eine andere PDF hoch.'
            )
          )
        }

        const extracted = await extractResponse.json()
        if (
          extracted?.error ||
          typeof extracted?.text !== 'string' ||
          !extracted.text.trim()
        ) {
          throw new Error(
            normalizeStatusError(
              extractResponse.status,
              typeof extracted?.error === 'string' ? extracted.error : '',
              'Der Erwartungshorizont konnte nicht verarbeitet werden. Bitte lade eine andere PDF hoch.'
            )
          )
        }

        extractedText = extracted.text.trim()
        extractedTextHash =
          typeof extracted?.textHash === 'string' ? extracted.textHash : null
        resolvedFileHash =
          typeof extracted?.fileHash === 'string' ? extracted.fileHash : localFileHash

        if (extractedTextHash) {
          storeCachedExtraction({
            fileHash: resolvedFileHash,
            fileName: file.fileName,
            text: extractedText,
            textHash: extractedTextHash,
            updatedAt: new Date().toISOString(),
          })
        }
      }

      setExpectationFileName(file.fileName)
      setExpectationFileKey(fileKey)
      setExpectationText(extractedText)
      setExpectationFileHash(resolvedFileHash)
      setExpectationTextHash(extractedTextHash)
      setExpectationError(null)
      toast.success('Erwartungshorizont erfolgreich hochgeladen!')
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        'Der Erwartungshorizont konnte nicht verarbeitet werden. Bitte lade eine andere PDF hoch.'
      )
      setExpectationText(null)
      setExpectationFileName(null)
      setExpectationFileKey(null)
      setExpectationFileHash(null)
      setExpectationTextHash(null)
      setHasAcceptedDataPrivacy(false)
      setExpectationError(message)
      toast.error(message)
    }
  }

  const handleKlausurUpload = (files: UploadedFile[]) => {
    setFlowErrorMessage(null)
    setErrorMessage(null)
    setUploads(prev => [...prev, ...files.slice(0, 30)])
  }

  const handleRemoveUpload = (id: string) => {
    setUploads(prev => prev.filter(file => file.id !== id))
    // Also remove from processedFilesRef if user manually removes before analysis
    processedFilesRef.current.delete(id)
    setReanalysisDecisions((prev) => {
      const next = { ...prev }
      delete next[id]
      reanalysisDecisionsRef.current = next
      return next
    })
    surfacedUploadErrorKeysRef.current.forEach((key) => {
      if (key.startsWith(`${id}:`)) surfacedUploadErrorKeysRef.current.delete(key)
    })
  }

  const handleSetReanalysisDecision = (id: string, decision: 'reanalyze' | 'skip') => {
    setReanalysisDecisions((prev) => {
      const next = { ...prev, [id]: decision }
      reanalysisDecisionsRef.current = next
      return next
    })
  }

  const handleRetryFile = (id: string) => {
    uploadQueue.retryItem(id)
    analysisQueue.removeItem(id)
    queuedAnalysesRef.current.delete(id)
    surfacedUploadErrorKeysRef.current.forEach((key) => {
      if (key.startsWith(`${id}:`)) surfacedUploadErrorKeysRef.current.delete(key)
    })
    batchOutcomeHandledRef.current = false
    setIsAnalyzing(true)
    setFlowErrorMessage(null)
    setAnalysisStatusMessage('Der erneute Versuch wurde gestartet. Bitte warte kurz auf die neue Verarbeitung.')
    toast.info('Die Verarbeitung wird für diese Datei erneut gestartet.')
  }

  const handleStartAnalysis = async () => {
    // FIX: Prevent race condition - early return if already analyzing
    if (isAnalyzing) {
      console.log('Analyse läuft bereits – doppelter Klick ignoriert.')
      return
    }
    
    try {
      if (!isCourseComplete) {
        setErrorMessage('Bitte vervollständige zuerst die Kursdaten.')
        return
      }
      if (unresolvedReanalysisCount > 0) {
        setErrorMessage('Bitte entscheide bei allen bereits analysierten Dateien, ob du sie erneut analysieren oder das vorhandene Ergebnis behalten möchtest.')
        setFlowErrorMessage('Mindestens eine bereits analysierte Datei wartet noch auf deine Entscheidung. Ohne diese Auswahl wird keine Analyse gestartet.')
        return
      }
      if (expectationError) {
        setErrorMessage('Der Erwartungshorizont konnte noch nicht verarbeitet werden. Bitte behebe zuerst den Fehler in Schritt 2 und lade die PDF erneut hoch.')
        setFlowErrorMessage('Der Upload- oder Extraktionsfehler liegt beim Erwartungshorizont in Schritt 2. Die Datenschutz-Checkbox oder der Start-Button blockieren nicht das Weiterkommen.')
        return
      }
      // FIX: Validate expectation text length (matches API validation)
      if (!expectationText || !expectationText.trim() || expectationText.trim().length < 10) {
        setErrorMessage('Der Erwartungshorizont ist zu kurz. Bitte lade einen vollständigen Erwartungshorizont hoch (mindestens 10 Zeichen).')
        return
      }
      if (uploads.length === 0) {
        setErrorMessage('Bitte lade mindestens eine Klausur hoch.')
        return
      }
      if (!isLoaded) {
        console.log('Result-Storage noch nicht geladen – Analyse-Start abgebrochen.')
        return
      }

      setErrorMessage(null)
      setFlowErrorMessage(null)
      setIsAnalyzing(true)
      batchOutcomeHandledRef.current = false
      setAnalysisStatusMessage('Die Analyse wurde gestartet. Bitte diese Seite geöffnet lassen und nicht neu laden oder verlassen, bis die Auswertung abgeschlossen ist.')

    const currentResults = readResults()

    // ============================================================================
    // LAYER 1 + LAYER 3: PRE-FLIGHT CHECKS WITH SESSION GUARD
    // ============================================================================
    const filesToProcess = uploads.filter((file) => {
      // SESSION GUARD: Has this file ID been processed in this session?
      if (processedFilesRef.current.has(file.id)) {
        console.log(
          `[SESSION-GUARD] ${file.fileName} (ID: ${file.id}) wurde bereits in dieser Session verarbeitet. SKIP.`
        )
        // Ensure UI reflects completed state
        uploadQueue.updateItem(file.id, {
          status: 'completed',
          progress: 100,
        })
        return false
      }

      // STORAGE GUARD: Is there already a finished result in localStorage?
      const alreadyDone = currentResults.some(
        (r) => r.fileName === file.fileName && r.status === 'Bereit'
      )
      const forceReanalysis =
        file.forceReanalysis || reanalysisDecisionsRef.current[file.id] === 'reanalyze'

      if (alreadyDone) {
        if (forceReanalysis) {
          console.log(
            `[FORCE-REANALYZE] ${file.fileName} wurde bereits analysiert, wird aber bewusst erneut analysiert.`
          )
          return true
        }
        console.log(
          `[STORAGE-GUARD] ${file.fileName} ist bereits fertig analysiert im Storage. SKIP.`
        )
        // Mark in all guard refs
        processedFilesRef.current.add(file.id)
        savedCorrectionsRef.current.add(file.id)
        
        uploadQueue.updateItem(file.id, {
          status: 'completed',
          progress: 100,
        })
        return false
      }

      // SAVED CORRECTIONS GUARD: Additional safety check
      if (savedCorrectionsRef.current.has(file.id)) {
        console.log(
          `[SAVED-GUARD] ${file.fileName} (ID: ${file.id}) ist bereits in savedCorrectionsRef. SKIP.`
        )
        processedFilesRef.current.add(file.id)
        uploadQueue.updateItem(file.id, {
          status: 'completed',
          progress: 100,
        })
        return false
      }

      // QUEUE STATUS GUARD: Is this file already in progress?
      const uploadItem = uploadQueue.queue.find((q) => q.id === file.id)
      if (
        uploadItem &&
        (uploadItem.status === 'analyzing' ||
          uploadItem.status === 'completed')
      ) {
        console.log(
          `[QUEUE-GUARD] ${file.fileName} ist bereits in Bearbeitung/fertig. SKIP.`
        )
        processedFilesRef.current.add(file.id)
        return false
      }

      return true
    })

    const filesToProcessWithDecision = filesToProcess.map((file) => ({
      file,
      forceReanalysis:
        file.forceReanalysis || reanalysisDecisionsRef.current[file.id] === 'reanalyze',
    }))

    if (filesToProcessWithDecision.length === 0) {
      console.log(
        '✅ Alle hochgeladenen Klausuren sind bereits analysiert – nichts Neues zu tun.'
      )
      setIsAnalyzing(false)
      const hasExistingErrors =
        uploadQueue.queue.some(item => ['error', 'errorfinal'].includes(item.status)) ||
        analysisQueue.queue.some(item => ['error', 'errorfinal'].includes(item.status))

      if (hasExistingErrors) {
        setAnalysisStatusMessage(
          'Es gibt noch fehlgeschlagene Dateien. Bitte nutze bei diesen den Button "Erneut versuchen".'
        )
        setFlowErrorMessage(
          'Mindestens eine Datei ist fehlgeschlagen. Bitte starte den Retry direkt an der betroffenen Datei; der Start-Button allein behebt diese Fehler nicht.'
        )
        return
      }

      setAnalysisStatusMessage(
        'Die ausgewählten Klausuren wurden bereits analysiert. Es wurde keine neue Analyse gestartet.'
      )
      setFlowErrorMessage(
        selectedReanalysisCount === 0
          ? 'Alle aktuell ausgewählten Dateien liegen bereits als fertige Ergebnisse vor. Bitte entscheide in der Dateiliste ausdrücklich, ob du diese Dateien erneut analysieren oder das vorhandene Ergebnis behalten möchtest.'
          : 'Alle aktuell ausgewählten Dateien liegen bereits als fertige Ergebnisse vor. Wenn du eine neue Analyse möchtest, wähle dafür in der Liste ausdrücklich "Erneut analysieren (-1 Credit)".'
      )
      toast.info('Diese Klausuren wurden bereits analysiert.')
      return
    }

    // ============================================================================
    // MARK FILES AS PROCESSED IMMEDIATELY (BEFORE QUEUEING)
    // This prevents re-queueing on subsequent re-renders
    // ============================================================================
    filesToProcessWithDecision.forEach(({ file }) => {
      processedFilesRef.current.add(file.id)
      console.log(`[SESSION-GUARD] Markiere ${file.fileName} (ID: ${file.id}) als verarbeitet.`)
    })
    setReanalysisDecisions((prev) => {
      const next = { ...prev }
      filesToProcessWithDecision.forEach(({ file }) => delete next[file.id])
      reanalysisDecisionsRef.current = next
      return next
    })

    // Add to upload queue (Layer 2 deduplication inside useUploadQueue)
    uploadQueue.addToQueue(
      filesToProcessWithDecision.map(({ file, forceReanalysis }) => ({
        ...file,
        forceReanalysis,
      }))
    )

    // Create storage entries for new files
    for (const { file } of filesToProcessWithDecision) {
      if (savedCorrectionsRef.current.has(file.id)) {
        continue
      }

      const entry = {
        id: file.id,
        studentName: file.fileName.replace('.pdf', ''),
        status: 'Analyse läuft…' as const,
        fileName: file.fileName,
        course,
        analysis: null,
        fileUrl: (file as any).fileKey ?? null,             // Klausur-PDF
        expectationUrl: expectationFileKey ?? null // Erwartungshorizont-PDF (aus dem State)
      }

      appendToStorage(entry)

      try {
        await fetch('/api/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
      } catch (error) {
        console.error('Fehler beim Speichern in Supabase', error)
      }
    }
    } catch (error) {
      console.error('Fehler beim Starten der Analyse:', error)
      setIsAnalyzing(false)
      setAnalysisStatusMessage(null)
      const message = getUserFacingErrorMessage(
        error,
        'Die Analyse konnte nicht gestartet werden. Bitte versuche es erneut.'
      )
      setFlowErrorMessage(message)
      toast.error(message)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    if (params.get('restart') !== '1') return

    const rawPayload = localStorage.getItem(RESTART_CORRECTION_STORAGE_KEY)
    if (!rawPayload) return

    let payload: RestartCorrectionPayload | null = null
    try {
      payload = JSON.parse(rawPayload) as RestartCorrectionPayload
    } catch (error) {
      console.error('Fehler beim Lesen des Restart-Payloads:', error)
    } finally {
      localStorage.removeItem(RESTART_CORRECTION_STORAGE_KEY)
      window.history.replaceState({}, '', '/correction')
    }

    if (!payload?.fileKey || !payload.expectationKey) {
      setFlowErrorMessage('Die gespeicherten Quelldateien für den Neustart konnten nicht geladen werden.')
      return
    }

    pendingRestartAutostartRef.current = payload

    removeStorageEntry(payload.id)
    processedFilesRef.current.delete(payload.id)
    savedCorrectionsRef.current.delete(payload.id)
    queuedAnalysesRef.current.delete(payload.id)
    batchOutcomeHandledRef.current = false

    setCourse(payload.course)
    localStorage.setItem('courseContext', JSON.stringify(payload.course))
    setUploads([
      {
        id: payload.id,
        fileName: payload.fileName,
        fileKey: payload.fileKey,
        forceReanalysis: true,
      },
    ])
    setExpectationFileKey(payload.expectationKey)
    setExpectationFileName(payload.expectationFileName || 'Erwartungshorizont.pdf')
    setExpectationText(null)
    setExpectationError(null)
    setFlowErrorMessage(null)
    setErrorMessage(null)
    setHasAcceptedDataPrivacy(true)
    setAnalysisStatusMessage('Die Klausur wird mit den bereits gespeicherten PDFs komplett neu gestartet.')

    ;(async () => {
      try {
        const extractResponse = await fetch('/api/extract-klausur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey: payload.expectationKey }),
        })

        if (!extractResponse.ok) {
          throw new Error(
            await readApiErrorMessage(
              extractResponse,
              'Der gespeicherte Erwartungshorizont konnte für den Neustart nicht geladen werden.'
            )
          )
        }

        const extracted = await extractResponse.json()
        if (
          extracted?.error ||
          typeof extracted?.text !== 'string' ||
          !extracted.text.trim()
        ) {
          throw new Error(
            normalizeStatusError(
              extractResponse.status,
              typeof extracted?.error === 'string' ? extracted.error : '',
              'Der gespeicherte Erwartungshorizont konnte für den Neustart nicht geladen werden.'
            )
          )
        }

        setExpectationText(extracted.text.trim())
        setExpectationFileHash(
          typeof extracted?.fileHash === 'string' ? extracted.fileHash : null
        )
        setExpectationTextHash(
          typeof extracted?.textHash === 'string' ? extracted.textHash : null
        )
        toast.info('Die gespeicherte Klausur wird jetzt erneut analysiert.')
      } catch (error) {
        pendingRestartAutostartRef.current = null
        const message = getUserFacingErrorMessage(
          error,
          'Die gespeicherten Dateien konnten für den Neustart nicht geladen werden.'
        )
        setExpectationError(message)
        setFlowErrorMessage(message)
        toast.error(message)
      }
    })()
  }, [])

  useEffect(() => {
    if (!pendingRestartAutostartRef.current) return
    if (!expectationText?.trim()) return
    if (uploads.length === 0) return
    if (!hasAcceptedDataPrivacy) return
    if (!isLoaded) return

    pendingRestartAutostartRef.current = null
    void handleStartAnalysis()
  }, [expectationText, uploads.length, hasAcceptedDataPrivacy, isLoaded])

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) throw new Error('Datei zu groß (max 50MB)')
    
    const urlResponse = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size })
    })

    if (!urlResponse.ok) {
      throw new Error(
        await readApiErrorMessage(
          urlResponse,
          'Der Upload der Datei konnte nicht vorbereitet werden. Bitte versuche es erneut.'
        )
      )
    }

    const { uploadUrl, fileKey } = await urlResponse.json()
    const xhr = new XMLHttpRequest()

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          // Optional: Update detailed upload progress here if needed
        }
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(fileKey)
        else {
          reject(
            new Error(
              normalizeStatusError(
                xhr.status,
                '',
                'Der Upload der Datei ist fehlgeschlagen. Bitte versuche es erneut.'
              )
            )
          )
        }
      })
      xhr.addEventListener('error', () =>
        reject(
          new Error(
            'Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.'
          )
        )
      )
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  // Upload Queue with callbacks
  const uploadQueue = useUploadQueue({
    maxConcurrent: 4,
    onExtractComplete: async (item, text) => {
      // GUARD: Check if already saved
      if (savedCorrectionsRef.current.has(item.id)) {
        console.log(
          `[EXTRACT-GUARD] ${item.fileName} (ID: ${item.id}) ist bereits gespeichert. SKIP Analyse.`
        )
        uploadQueue.updateItem(item.id, { status: 'completed', progress: 100 })
        return
      }

      // GUARD: Check storage for existing result
      const currentResults = readResults()
      const alreadyDone = currentResults.some(
        (r) => r.fileName === item.fileName && r.status === 'Bereit'
      )
      if (alreadyDone && !item.forceReanalysis) {
        console.log(
          `[EXTRACT-GUARD] ${item.fileName} ist bereits im Storage als 'Bereit'. SKIP Analyse.`
        )
        savedCorrectionsRef.current.add(item.id)
        uploadQueue.updateItem(item.id, { status: 'completed', progress: 100 })
        return
      }

      // GUARD: Prevent double-queueing of analysis
      if (queuedAnalysesRef.current.has(item.id)) {
        console.log(
          `[EXTRACT-GUARD] Analyse für ${item.fileName} (ID: ${item.id}) wurde bereits gestartet. SKIP.`
        )
        return
      }

      if (!expectationText?.trim()) throw new Error('Erwartungshorizont fehlt')
      
      console.log(`${item.fileName} Extraktion abgeschlossen, füge zur Analyse-Queue hinzu...`)
      
      // Update entry in Supabase mit fileKey (falls vorhanden)
      if (item.fileKey) {
        try {
          await fetch('/api/corrections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: item.id,
              studentName: item.fileName.replace('.pdf', ''),
              fileName: item.fileName,
              course,
              status: 'Analyse läuft…',
              fileUrl: item.fileKey,
              expectationUrl: expectationFileKey ?? null
            })
          })
        } catch (error) {
          console.error('Fehler beim Update des fileKey in Supabase', error)
        }
      }
      
      uploadQueue.updateItem(item.id, { status: 'analyzing', progress: 72 })
      
      queuedAnalysesRef.current.add(item.id)
      
      analysisQueue.addToQueue([{
        id: item.id,
        fileName: item.fileName,
        klausurText: text.trim(),
        erwartungshorizont: expectationText.trim(),
        subject: course.subject,
        studentName: item.fileName.replace('.pdf', ''),
        className: course.className,
        gradeLevel: course.gradeLevel,
        schoolYear: course.schoolYear,
        correctionId: item.id,
        status: 'pending',
        fileKey: item.fileKey ?? null,
        forceReanalysis: item.forceReanalysis,
        klausurFileHash: item.fileHash ?? null,
        klausurTextHash: item.textHash ?? null,
        erwartungshorizontFileHash: expectationFileHash ?? null,
        erwartungshorizontHash: expectationTextHash ?? null,
      }])
    }
  })

  const analysisQueue = useAnalysisQueue({
    maxConcurrent: 5,
    getStoredResult: (item) => {
      if (item.forceReanalysis) return null
      return getStoredResult(item.correctionId)
    },
    shouldSkipAnalysis: (item) => {
      if (item.forceReanalysis) {
        return false
      }
      if (savedCorrectionsRef.current.has(item.correctionId)) {
        console.log(
          `[ANALYSIS-GUARD] ${item.fileName} (ID: ${item.correctionId}) ist bereits in savedCorrectionsRef. SKIP API-Call.`
        )
        return true
      }
      const currentResults = readResults()
      const alreadyDone = currentResults.some(
        (r) => r.id === item.correctionId && r.status === 'Bereit'
      )
      if (alreadyDone) {
        console.log(
          `[ANALYSIS-GUARD] ${item.fileName} (ID: ${item.correctionId}) ist bereits im Storage als 'Bereit'. SKIP API-Call.`
        )
        savedCorrectionsRef.current.add(item.correctionId)
        return true
      }
      return false
    },
    onAnalysisComplete: async (item, analysis) => {
      if (savedCorrectionsRef.current.has(item.correctionId)) {
        console.log(`Korrektur ${item.correctionId} wurde bereits gespeichert, überspringe erneutes Speichern.`);
        return;
      }
      savedCorrectionsRef.current.add(item.correctionId);

      const analysisForServer = mergeAnalysisInternal(analysis, undefined, {
        ocrText: item.klausurText,
        ocrVersion: OCR_INTERNAL_VERSION,
        ocrSource: 'gemini',
        extractedAt: new Date().toISOString(),
      })
      const analysisForLocal = stripAnalysisForLocalCache(analysisForServer)

      const entry = {
        id: item.correctionId,
        studentName: item.fileName.replace('.pdf', ''),
        status: 'Bereit' as const,
        fileName: item.fileName,
        course,
        analysis: analysisForServer,
        fileUrl: item.fileKey ?? null,           // <- WICHTIG
        expectationUrl: expectationFileKey ?? null,
      };

      updateStorageEntry(item.correctionId, { status: 'Bereit', analysis: analysisForLocal });

      try {
        await fetch('/api/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        console.log('✅ CLEAN SAVE DONE:', item.fileName, item.correctionId, 'fileKey:', item.fileKey);
      } catch (error) {
        console.error('Fehler beim Update in Supabase', error);
      }

      uploadQueue.updateItem(item.correctionId, { status: 'completed', progress: 100 });
    },
    onError: async (item, error, finalStatus) => {
      console.error(`${item.fileName} Analyse fehlgeschlagen:`, error)
      updateStorageEntry(item.correctionId!, {
        status: 'Fehler',
        analysis: { error, _internal: { ocrVersion: OCR_INTERNAL_VERSION } },
        gesamtpunkte: 0,
        erreichtePunkte: 0,
        prozent: 0,
        zusammenfassung: `Fehler bei der Analyse: ${error}`
      })
      
      try {
        await fetch('/api/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.correctionId,
            studentName: item.fileName.replace('.pdf', ''),
            fileName: item.fileName,
            course,
            status: 'Fehler',
            fileUrl: (item as any).fileKey ?? null,
            expectationUrl: expectationFileKey ?? null
          })
        })
      } catch (err) {
        console.error('Fehler beim Update in Supabase', err)
      }
      
      uploadQueue.updateItem(item.correctionId!, {
        status: finalStatus,
        progress: 0,
        error,
      })
      setFlowErrorMessage(
        'Mindestens eine Datei konnte nicht verarbeitet werden. Die Ursache liegt im Upload-, Extraktions- oder Analyse-Schritt der betroffenen Datei und nicht an der Datenschutz-Checkbox oder dem Start-Button.'
      )
      toast.error(`${item.fileName}: ${error}`)
    }
  })

  useEffect(() => {
    uploadQueue.queue.forEach((item) => {
      if (!['error', 'errorfinal'].includes(item.status) || !item.error) return

      const errorKey = `${item.id}:${item.error}`
      if (surfacedUploadErrorKeysRef.current.has(errorKey)) return

      surfacedUploadErrorKeysRef.current.add(errorKey)
      toast.error(`${item.fileName}: ${item.error}`)
    })
  }, [uploadQueue.queue])

  useEffect(() => {
    const activeAnalysisIds = new Set(
      analysisQueue.queue
        .filter((item) => ['pending', 'analyzing'].includes(item.status))
        .map((item) => item.id)
    )

    if (activeAnalysisIds.size === 0) return

    const intervalId = window.setInterval(() => {
      uploadQueue.queue.forEach((item) => {
        if (!activeAnalysisIds.has(item.id)) return
        if (item.status !== 'analyzing') return
        if (item.progress >= 94) return

        uploadQueue.updateItem(item.id, {
          progress: Math.min(item.progress + 3, 94),
        })
      })
    }, 800)

    return () => window.clearInterval(intervalId)
  }, [analysisQueue.queue, uploadQueue.queue, uploadQueue.updateItem])

  // ========================================================================
  // FINALER REDIRECT: HARD FORCE
  // Prüft, ob ALLE Uploads UND Analysen fertig sind
  // ========================================================================
  useEffect(() => {
    // Abbruch, wenn Analyse nicht aktiv oder leer
    if (!isAnalyzing || uploadQueue.totalCount === 0 || batchOutcomeHandledRef.current) return

    // KRITISCH: Prüfe, ob ALLE Queue-Items wirklich fertig sind (nicht nur Upload, auch Analyse)
    const allFinished = uploadQueue.queue.every(item => 
      ['completed', 'error', 'errorfinal'].includes(item.status)
    )

    // ZUSÄTZLICH: Prüfe, ob alle Analysen auch fertig sind
    const allAnalysesFinished = analysisQueue.queue.length === 0 || 
      analysisQueue.queue.every(item => 
        ['completed', 'error', 'errorfinal'].includes(item.status)
      )

    if (!allFinished || !allAnalysesFinished) {
      return
    }

    batchOutcomeHandledRef.current = true

    const failedIds = new Set<string>()
    uploadQueue.queue.forEach((item) => {
      if (['error', 'errorfinal'].includes(item.status)) failedIds.add(item.id)
    })
    analysisQueue.queue.forEach((item) => {
      if (['error', 'errorfinal'].includes(item.status)) failedIds.add(item.id)
    })
    const totalErrors = failedIds.size
    const completedCount = uploadQueue.queue.filter(
      item => item.status === 'completed'
    ).length

    if (totalErrors === 0) {
      console.log("🚀 ALLE UPLOADS UND ANALYSEN FERTIG. ZWINGE WEITERLEITUNG.")
      setFlowErrorMessage(null)
      setAnalysisStatusMessage('Analyse abgeschlossen. Du wirst jetzt zu den Ergebnissen weitergeleitet.')
      setIsAnalyzing(false)

      setTimeout(() => {
        window.location.href = '/results'
      }, 1500)
      return
    }

    setIsAnalyzing(false)
    setAnalysisStatusMessage(
      `${completedCount} Analysen erfolgreich, ${totalErrors} fehlgeschlagen. Bitte fehlerhafte Dateien erneut versuchen.`
    )
    setFlowErrorMessage(
      'Mindestens eine Datei konnte nicht vollständig verarbeitet werden. Die Fehlermeldungen stehen direkt an den betroffenen Dateien. Bitte versuche diese Dateien erneut; die Datenschutz-Checkbox oder der Start-Button sind nicht der Blocker.'
    )
  }, [isAnalyzing, uploadQueue.queue, analysisQueue.queue, uploadQueue.totalCount])

  // beforeunload Handler zum Schutz vor versehentlichem Verlassen
  useEffect(() => {
    if (!isAnalyzing || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Wenn du die Seite verlässt, kann die Analyse abgebrochen werden.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnalyzing])

  // Navigation-Schutz: Body-Klasse setzen während Analyse
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    if (isAnalyzing) {
      document.body.classList.add('analyzing-active');
    } else {
      document.body.classList.remove('analyzing-active');
    }

    return () => {
      document.body.classList.remove('analyzing-active');
    };
  }, [isAnalyzing])

  return (
    <ProtectedRoute>
      <section className="module-section">
        <div className="container">
        {/* Helper Component für Steps - hier angenommen, dass es existiert oder importiert wird */}
        {/* <ProcessStepper currentStep={getCurrentStep()} /> */} 
        {/* Falls ProcessStepper nicht importiert ist, einkommentieren oder entfernen */}

        <h2 className="section-title">Lass uns korrigieren</h2>
        <p className="section-description">
          Gib kurz die Eckdaten ein und lade die Unterlagen hoch. Den Rest erledigt KorrekturPilot.
        </p>

        {errorMessage && (
          <div className="correction-error-message">
            {errorMessage}
          </div>
        )}

        <div className="module-grid" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div className="module-card" id="step-1-kursdaten">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <StepIndicator 
                stepNumber={1} 
                isComplete={isCourseComplete} 
                isCurrent={!isCourseComplete} 
              />
              <h3 style={{ margin: 0 }}>Schritt 1: Kursdaten</h3>
            </div>
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <CourseSelectionCard
                course={course}
                onChange={handleCourseChange}
                subjectOptions={SUBJECT_OPTIONS}
                gradeOptions={GRADE_OPTIONS}
                classOptions={CLASS_OPTIONS}
                blinkingField={blinkingField}
              />
            </div>
          </div>
        </div>

        <div className="process-grid" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div 
            className="process-card"
            id="step-2-erwartungshorizont"
            style={{ 
              opacity: isCourseComplete ? 1 : 0.5, 
              pointerEvents: isCourseComplete ? 'auto' : 'none',
              display: 'flex', flexDirection: 'column', height: '100%', position: 'relative'
            }}
            onClick={!isCourseComplete ? () => handleDisabledStepClick(2) : undefined}
          >
            {!isCourseComplete && (
              <div 
                className="process-card-overlay"
                onClick={e => { e.stopPropagation(); handleDisabledStepClick(2) }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <StepIndicator 
                stepNumber={2} 
                isComplete={!!expectationText} 
                isCurrent={isCourseComplete && !expectationText} 
              />
              <h3 style={{ margin: 0 }}>Schritt 2: Bewertungsmastab</h3>
            </div>
            <p style={{ marginBottom: 'var(--spacing-lg)', minHeight: '4.5rem' }}>
              Lade hier den Erwartungshorizont hoch, an der sich der KorrekturPilot orientieren soll.
            </p>
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              opacity: isCourseComplete ? 1 : 0.6,
              pointerEvents: isCourseComplete ? 'auto' : 'none',
              transition: 'opacity 0.3s ease'
            }}>
              <UploadBox
                title="Erwartungshorizont hochladen"
                description="PDF-Format"
                buttonLabel="Datei auswählen"
                onUpload={handleExpectationUpload}
                disabled={!isCourseComplete}
                onDisabledClick={handleDisabledUploadClick}
              />
              {expectationError && (
                <div style={{
                  marginTop: 'var(--spacing-lg)',
                  padding: 'var(--spacing-md)',
                  background: 'var(--color-error-light)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--color-error-dark)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)'
                }}>
                  <strong>Der Erwartungshorizont konnte nicht verarbeitet werden.</strong>
                  <span>{expectationError}</span>
                  <span>Bitte lade dieselbe oder eine andere PDF erneut hoch.</span>
                </div>
              )}
              {expectationFileName && expectationText && (
                <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-success-light)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: 'var(--color-success-dark)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} aria-hidden="true">
                    <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
                  </svg>
                  <span>Erwartungshorizont erfolgreich hochgeladen: {expectationFileName}</span>
                </div>
              )}
            </div>
          </div>

          <div 
            className="process-card"
            id="step-3-datenschutz"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              borderLeft: '4px solid var(--color-error, #ef4444)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <StepIndicator 
                stepNumber={3} 
                isComplete={Boolean(expectationText && hasAcceptedDataPrivacy)} 
                isCurrent={isCourseComplete && !!expectationText && !hasAcceptedDataPrivacy} 
              />
              <h3 style={{ margin: 0 }}>Schritt 3: Datenschutz bestätigen</h3>
            </div>

            <p style={{ marginBottom: 'var(--spacing-lg)', minHeight: '4.5rem' }}>
              Bitte bestätige, dass alle Klausuren anonymisiert wurden.
            </p>

            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              opacity: (isCourseComplete && !!expectationText) ? 1 : 0.6,
              pointerEvents: (isCourseComplete && !!expectationText) ? 'auto' : 'none',
              transition: 'opacity 0.3s ease'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-gray-200)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <input
                  type="checkbox"
                  id="privacy-consent"
                  checked={hasAcceptedDataPrivacy}
                  onChange={(e) => setHasAcceptedDataPrivacy(e.target.checked)}
                  disabled={!isCourseComplete || !expectationText}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginTop: '2px',
                    cursor: (isCourseComplete && expectationText) ? 'pointer' : 'not-allowed',
                    accentColor: 'var(--color-primary)',
                    flexShrink: 0
                  }}
                />
                <label 
                  htmlFor="privacy-consent"
                  style={{ 
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    color: 'var(--color-gray-900)',
                    cursor: (isCourseComplete && expectationText) ? 'pointer' : 'not-allowed'
                  }}
                >
                  Ich bestätige, dass alle Klausuren anonymisiert wurden und den Datenschutzrichtlinien entsprechen.
                </label>
              </div>

              <a 
                href="https://www.korrekturpilot.de/hilfe-upload" 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--color-primary)', 
                  textDecoration: 'underline'
                }}
              >
                Detaillierte Anleitung zur Anonymisierung
              </a>
            </div>
          </div>

          <div 
            className="process-card"
            id="step-4-klausuren"
            style={{ 
              opacity: (isCourseComplete && !!expectationText && hasAcceptedDataPrivacy) ? 1 : 0.5, 
              pointerEvents: (isCourseComplete && !!expectationText && hasAcceptedDataPrivacy) ? 'auto' : 'none',
              display: 'flex', flexDirection: 'column', height: '100%', position: 'relative'
            }}
            onClick={(!isCourseComplete || !expectationText || !hasAcceptedDataPrivacy) ? () => handleDisabledStepClick(4) : undefined}
          >
            {(!isCourseComplete || !expectationText || !hasAcceptedDataPrivacy) && (
              <div 
                className="process-card-overlay"
                onClick={e => { e.stopPropagation(); handleDisabledStepClick(4) }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <StepIndicator 
                stepNumber={4} 
                isComplete={uploads.length > 0} 
                isCurrent={!!expectationText && hasAcceptedDataPrivacy && uploads.length === 0} 
              />
              <h3 style={{ margin: 0 }}>Schritt 4: Klausuren der Schüler</h3>
            </div>
            <p style={{ marginBottom: 'var(--spacing-lg)', minHeight: '4.5rem' }}>
              Lade hier die gescannten Arbeiten hoch (max. 30 PDFs möglich).
            </p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <UploadBox
                title="Schülerarbeiten hochladen"
                description="Drag & Drop oder Auswählen"
                buttonLabel="Dateien auswählen"
                allowMultiple
                onUpload={handleKlausurUpload}
                disabled={!isCourseComplete || !expectationText || !hasAcceptedDataPrivacy}
                onDisabledClick={handleDisabledUploadClick}
              />
              
              {/* NEU: Empfehlung für kleinere Batches */}
              <div style={{ 
                marginTop: 'var(--spacing-md)', 
                padding: 'var(--spacing-md)', 
                background: 'var(--color-info-light)', 
                border: '1px solid var(--color-primary)', 
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-sm)'
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--spacing-xs)' }}>
                    Tipp für zuverlässigere Analysen
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-700)', lineHeight: '1.5' }}>
                    Bei vielen Klausuren empfehlen wir, die Arbeiten in kleineren Gruppen hochzuladen (z.B. 2×15 statt 30 auf einmal). 
                    So läuft die Verarbeitung stabiler und die Auswertungen werden in der aktuellen Beta‑Version zuverlässiger angezeigt.
                  </p>
                </div>
              </div>
              
              {uploads.length > 0 && uploadQueue.totalCount === 0 && (
                <>
                  <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-success-light)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-lg)', color: 'var(--color-success-dark)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} aria-hidden="true">
                      <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
                    </svg>
                    <span>{uploads.length} {uploads.length === 1 ? 'Arbeit wurde hochgeladen' : 'Arbeiten wurden hochgeladen'}</span>
                  </div>
                  {alreadyAnalyzedUploadIds.size > 0 && (
                    <div
                      style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-info-light)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--color-gray-800)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-xs)',
                      }}
                    >
                      <strong>Bereits analysierte Dateien erkannt</strong>
                      <span>
                        {alreadyAnalyzedUploadIds.size} Datei{alreadyAnalyzedUploadIds.size === 1 ? '' : 'en'} aus deiner Auswahl liegen bereits als fertige Ergebnisse vor.
                      </span>
                      <span>
                        Du musst für jede dieser Dateien unten ausdrücklich entscheiden, ob sie erneut analysiert oder übersprungen werden soll. Pro erneut analysierter Datei wird 1 Credit verbraucht.
                      </span>
                      {unresolvedReanalysisCount > 0 && (
                        <span style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>
                          Offen: {unresolvedReanalysisCount} Entscheidung{unresolvedReanalysisCount === 1 ? '' : 'en'} erforderlich, bevor die Analyse gestartet werden kann.
                        </span>
                      )}
                      {selectedReanalysisCount > 0 && (
                        <span>
                          Aktuell ausgewählt für erneute Analyse: {selectedReanalysisCount} Datei{selectedReanalysisCount === 1 ? '' : 'en'}.
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: 'var(--spacing-lg)' }}>
                    <UploadedFilesList
                      files={uploads}
                      onRemove={handleRemoveUpload}
                      reanalyzableIds={alreadyAnalyzedUploadIds}
                      reanalysisDecisions={reanalysisDecisions}
                      onSetReanalysisDecision={handleSetReanalysisDecision}
                    />
                  </div>
                </>
              )}
              
              {uploadQueue.totalCount > 0 && (
                <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div
                    style={{
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-info-light)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: 'var(--color-gray-900)',
                        }}
                      >
                        Gesamt-Fortschritt
                      </span>
                      <span
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                        }}
                      >
                        {uploadQueue.completedCount}/{uploadQueue.totalCount} Dateien fertig · {uploadQueue.totalProgress}%
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--color-gray-200)',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${uploadQueue.totalProgress}%`,
                          height: '100%',
                          background: 'var(--color-primary)',
                          borderRadius: '9999px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* HIER ENDETE DEIN CODE-SCHNIPSEL - HIER IST DER REST */}
                  <UploadProgressList
                    items={uploadQueue.queue}
                    onRetry={handleRetryFile}
                    onRemove={(id) => {
                      uploadQueue.removeItem(id);
                      analysisQueue.removeItem(id);
                      setUploads((prev) => prev.filter((u) => u.id !== id));
                      // Also remove from session guard
                      processedFilesRef.current.delete(id);
                      queuedAnalysesRef.current.delete(id);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schritt 4: Start Button */}
        {(isCourseComplete && expectationText && hasAcceptedDataPrivacy && uploads.length > 0) && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-md)', 
            marginBottom: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-success-light)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-success)'
          }}>
            <StepIndicator stepNumber={5} isComplete={false} isCurrent={true} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-success-dark)' }}>
                Alle Schritte abgeschlossen!
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                Klicke auf &quot;Analyse starten&quot;, um die Korrektur zu beginnen.
              </p>
            </div>
          </div>
        )}

        {flowErrorMessage && (
          <div style={{
            marginBottom: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-error-light)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-error-dark)',
            lineHeight: '1.6'
          }}>
            {flowErrorMessage}
          </div>
        )}

        <AnalysisStartSection
          buttonText="Analyse starten"
          onStart={handleStartAnalysis}
          disabled={
            (!isCourseComplete || !expectationText || !hasAcceptedDataPrivacy || uploads.length === 0 || unresolvedReanalysisCount > 0) || 
            isAnalyzing
          }
          isAnalyzing={isAnalyzing}
          progress={uploadQueue.totalProgress as number}
          statusMessage={analysisStatusMessage}
        />
        </div>
      </section>
    </ProtectedRoute>
  )
}
