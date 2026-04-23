'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

import {
  getUserFacingErrorMessage,
  readApiErrorMessage,
} from '@/lib/user-facing-errors'

export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'error' | 'errorfinal'

export interface AnalysisQueueItem {
  id: string
  fileName: string
  klausurText: string
  erwartungshorizont: string
  subject?: string
  studentName?: string
  className?: string
  gradeLevel?: string
  schoolYear?: string
  correctionId: string
  status: AnalysisStatus
  error?: string
  analysis?: any
  retryCount?: number
  httpStatus?: number
  fileKey?: string | null // File Key aus Supabase Storage
  forceReanalysis?: boolean
  klausurFileHash?: string | null
  klausurTextHash?: string | null
  erwartungshorizontFileHash?: string | null
  erwartungshorizontHash?: string | null
  /**
   * Optional: manuell eingegebene Gesamtpunktzahl der Klausur.
   * Wird an /api/analyze durchgereicht und dort als autoritativer Max-Wert verwendet.
   */
  expectedMaxPoints?: number | null
}

interface UseAnalysisQueueOptions {
  maxConcurrent?: number
  onAnalysisComplete?: (item: AnalysisQueueItem, analysis: any) => Promise<void>
  onError?: (
    item: AnalysisQueueItem,
    error: string,
    finalStatus: AnalysisStatus
  ) => Promise<void>
  shouldSkipAnalysis?: (item: AnalysisQueueItem) => boolean | Promise<boolean>
  getStoredResult?: (item: AnalysisQueueItem) => { analysis: any } | null
}

export function useAnalysisQueue({
  maxConcurrent = 5,
  onAnalysisComplete,
  onError,
  shouldSkipAnalysis,
  getStoredResult
}: UseAnalysisQueueOptions = {}) {
  const [queue, setQueue] = useState<AnalysisQueueItem[]>([])
  const activeAnalysesRef = useRef<Set<string>>(new Set())
  const isProcessingRef = useRef(false)
  // FIX: Store timeout IDs for cleanup
  const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set())

  const isRetryableError = (error: any, httpStatus?: number): boolean => {
    if (error?.message?.toLowerCase().includes('netzwerk') || 
        error?.message?.toLowerCase().includes('network') ||
        error?.code === 'ECONNRESET' || 
        error?.code === 'ETIMEDOUT') return true
    
    if (error?.message?.toLowerCase().includes('timeout') || 
        error?.code === 'timeout' || 
        httpStatus === 408) return true
    
    if (httpStatus && httpStatus >= 500 && httpStatus < 600) return true
    if (httpStatus && httpStatus >= 400 && httpStatus < 500) return false
    
    return false
  }

  const processNext = useCallback(async () => {
    if (isProcessingRef.current) return
    if (activeAnalysesRef.current.size >= maxConcurrent) return
    
    const pendingItem = queue.find(item => item.status === 'pending')
    if (!pendingItem) return

    isProcessingRef.current = true
    activeAnalysesRef.current.add(pendingItem.id)

    const currentRetryCount = pendingItem.retryCount || 0
    setQueue(prev => prev.map(item => 
      item.id === pendingItem.id 
        ? { ...item, status: 'analyzing' as AnalysisStatus, retryCount: currentRetryCount }
        : item
    ))

    try {
      // HARD GUARD: Prüfe direkt vor dem API-Call, ob Analyse übersprungen werden soll
      if (shouldSkipAnalysis) {
        const shouldSkip = await shouldSkipAnalysis(pendingItem)
        if (shouldSkip) {
          console.log(
            `[Hard Guard] ${pendingItem.fileName} (ID: ${pendingItem.correctionId}) - Analyse wird übersprungen (bereits durchgeführt oder in Guard-Liste).`
          )
          // Markiere als completed ohne API-Call
          setQueue(prev => prev.map(item => 
            item.id === pendingItem.id 
              ? { ...item, status: 'completed' as AnalysisStatus, retryCount: 0 }
              : item
          ))
          // Rufe onAnalysisComplete nicht auf, da keine echte Analyse stattfand
          // (Das Backend Result-Freezing hat bereits das Ergebnis zurückgegeben)
          return
        }
      }

      // STORAGE-FIRST CHECK: Prüfe ob Ergebnis bereits im lokalen Storage vorhanden ist
      let storedAnalysis: any = null
      if (getStoredResult) {
        const storedResult = getStoredResult(pendingItem)
        if (storedResult && storedResult.analysis) {
          storedAnalysis = storedResult.analysis
          console.log(
            `[Storage-First] Ergebnis für ${pendingItem.fileName} liegt lokal vor. SPARE API CALL.`
          )
        }
      }

      let analysis: any

      if (storedAnalysis) {
        // Verwende gespeichertes Ergebnis statt API-Call
        analysis = storedAnalysis
        console.log(`[Storage-First] Verwende gespeichertes Ergebnis für ${pendingItem.fileName}`)
      } else {
        // Echter API-Call nur wenn kein Ergebnis im Storage vorhanden
        console.log(`${pendingItem.fileName} Starte Analyse...`)
        const analysisResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            klausurText: pendingItem.klausurText,
            erwartungshorizont: pendingItem.erwartungshorizont,
            correctionId: pendingItem.correctionId,
            subject: pendingItem.subject,
            studentName: pendingItem.studentName,
            className: pendingItem.className,
            gradeLevel: pendingItem.gradeLevel,
            schoolYear: pendingItem.schoolYear,
            klausurFileHash: pendingItem.klausurFileHash,
            klausurTextHash: pendingItem.klausurTextHash,
            erwartungshorizontFileHash: pendingItem.erwartungshorizontFileHash,
            erwartungshorizontHash: pendingItem.erwartungshorizontHash,
            expectedMaxPoints: pendingItem.expectedMaxPoints ?? undefined,
          })
        })

        if (!analysisResponse.ok) {
          const error = new Error(
            await readApiErrorMessage(
              analysisResponse,
              'Die Analyse konnte nicht durchgeführt werden. Bitte versuche es erneut.'
            )
          )
          ;(error as any).httpStatus = analysisResponse.status
          throw error
        }

        analysis = await analysisResponse.json()
      }
      setQueue(prev => prev.map(item => 
        item.id === pendingItem.id 
          ? { ...item, status: 'completed' as AnalysisStatus, analysis, retryCount: 0 }
          : item
      ))

      if (onAnalysisComplete) await onAnalysisComplete(pendingItem, analysis)

    } catch (error) {
      // FIX: Better error messages for network errors
      const errorMessage = getUserFacingErrorMessage(
        error,
        'Die Analyse konnte nicht durchgeführt werden. Bitte versuche es erneut.'
      )
      
      const prevRetry = pendingItem.retryCount ?? 0
      const nextRetry = prevRetry + 1
      let httpStatus: number | undefined
      if (error && typeof error === 'object') {
        httpStatus = (error as any).httpStatus || (error as any).status
      }

      const retryable = isRetryableError(error, httpStatus)
      const maxRetries = 3
      const finalStatus: AnalysisStatus = retryable && nextRetry <= maxRetries ? 'error' : 'errorfinal'

      setQueue(prev => prev.map(item => 
        item.id === pendingItem.id 
          ? { ...item, status: finalStatus, error: errorMessage, retryCount: nextRetry, httpStatus }
          : item
      ))

      if (onError) await onError(pendingItem, errorMessage, finalStatus)

      if (retryable && nextRetry <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, prevRetry), 8000)
        // FIX: Store timeout ID for cleanup
        const timeoutId = setTimeout(() => {
          timeoutIdsRef.current.delete(timeoutId)
          setQueue(prev => prev.map(item => 
            item.id === pendingItem.id 
              ? { ...item, status: 'pending' as AnalysisStatus, error: `${errorMessage}. Versuche es erneut...` }
              : item
          ))
        }, delay)
        timeoutIdsRef.current.add(timeoutId)
        return
      }
    } finally {
      if (activeAnalysesRef.current.has(pendingItem.id)) {
        activeAnalysesRef.current.delete(pendingItem.id)
      }
      isProcessingRef.current = false
      // FIX: Store timeout ID for cleanup
      const timeoutId = setTimeout(processNext, 100)
      timeoutIdsRef.current.add(timeoutId)
    }
  }, [queue, maxConcurrent, onAnalysisComplete, onError, shouldSkipAnalysis, getStoredResult])

  useEffect(() => {
    if (activeAnalysesRef.current.size < maxConcurrent) {
      const hasPendingItems = queue.some(item => item.status === 'pending')
      if (hasPendingItems) processNext()
    }
    
    // FIX: Cleanup all timeouts on unmount or when dependencies change
    return () => {
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutIdsRef.current.clear()
    }
  }, [queue, maxConcurrent, processNext])

  const addToQueue = useCallback((items: AnalysisQueueItem[]) => {
    setQueue(prev => [...prev, ...items])
  }, [])

  const updateItem = useCallback((id: string, updates: Partial<AnalysisQueueItem>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  const retryItem = useCallback((id: string) => {
    setQueue(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: 'pending' as AnalysisStatus, error: undefined, retryCount: 0, httpStatus: undefined }
        : item
    ))
  }, [])

  const removeItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
    activeAnalysesRef.current.delete(id)
  }, [])

  const completedCount = queue.filter(item => item.status === 'completed').length
  const errorCount = queue.filter(item => item.status === 'error' || item.status === 'errorfinal').length
  const activeCount = queue.filter(item => item.status === 'analyzing').length
  const totalCount = queue.length

  return {
    queue,
    addToQueue,
    updateItem,
    retryItem,
    removeItem,
    completedCount,
    errorCount,
    activeCount,
    totalCount
  }
}
