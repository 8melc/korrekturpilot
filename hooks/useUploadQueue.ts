// hooks/useUploadQueue.ts
import { useState, useEffect, useRef, useCallback } from 'react'

import {
  getUserFacingErrorMessage,
  normalizeStatusError,
  readApiErrorMessage,
} from '@/lib/user-facing-errors'

export interface QueueItem {
  id: string
  fileName: string
  file?: File
  status: 'pending' | 'uploading' | 'extracting' | 'analyzing' | 'completed' | 'error' | 'errorfinal'
  progress: number
  error?: string
  // Zusätzliche Felder für die Analyse
  correctionId?: string 
  klausurText?: string
  erwartungshorizont?: string
  fileKey?: string | null // File Key aus Supabase Storage
}

interface UseUploadQueueProps {
  maxConcurrent?: number
  onExtractComplete?: (item: QueueItem, text: string) => Promise<void>
}

export function useUploadQueue({ maxConcurrent = 3, onExtractComplete }: UseUploadQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [activeCount, setActiveCount] = useState(0)
  
  // LAYER 2 GUARD: Interne Deduplizierung
  // Verhindert, dass dieselbe ID jemals doppelt in den State kommt
  const queuedFileIdsRef = useRef<Set<string>>(new Set())

  // Helper zum Aktualisieren eines Items
  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  const addToQueue = useCallback((items: any[]) => {
    // FILTER: Nur Items zulassen, die noch nie in dieser Hook-Session gesehen wurden
    const uniqueItems = items.filter(item => {
      if (queuedFileIdsRef.current.has(item.id)) {
        console.log(`[INTERNAL-QUEUE-GUARD] ${item.fileName} ist bereits in der Queue-Historie. Ignoriere.`)
        return false
      }
      return true
    })

    if (uniqueItems.length === 0) return

    // Markiere als gesehen
    uniqueItems.forEach(item => queuedFileIdsRef.current.add(item.id))

    // Mappe zu QueueItems
    const newQueueItems: QueueItem[] = uniqueItems.map(item => ({
      ...item,
      status: 'pending',
      progress: 0
    }))

    setQueue(prev => [...prev, ...newQueueItems])
  }, [])

  const removeItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
    // WICHTIG: Wir entfernen es NICHT aus der queuedFileIdsRef, 
    // damit es in dieser Session nicht versehentlich automatisch wieder hinzugefügt wird.
    // Ein manuelles "Re-Add" müsste über eine neue ID oder einen Page-Reload geschehen,
    // oder wir entscheiden uns hier, den Schutz zu lockern. 
    // Für Stabilität lassen wir es im Ref.
  }, [])

  const retryItem = useCallback((id: string) => {
    updateItem(id, { status: 'pending', progress: 0, error: undefined })
  }, [updateItem])

  // Der Worker-Effekt
  useEffect(() => {
    const processQueue = async () => {
      // 1. Check Limits
      if (activeCount >= maxConcurrent) return

      // 2. Finde nächstes Item
      const nextItem = queue.find(item => item.status === 'pending')
      if (!nextItem) return

      // 3. Starte Verarbeitung
      setActiveCount(prev => prev + 1)
      updateItem(nextItem.id, { status: 'uploading', progress: 1 })

      try {
        // A) Upload Simulation / Logik
        // Hier gehen wir davon aus, dass das File-Objekt existiert
        if (!nextItem.file) {
            // Falls kein File-Objekt da ist (z.B. nur ID übergeben), überspringen wir direkt zu analyzing
            // oder werfen Fehler. Hier zur Sicherheit:
             updateItem(nextItem.id, { status: 'extracting', progress: 50 })
        } else {
             // Echter Upload Prozess würde hier passieren,
             // wir simulieren kurz den Upload-Step für die UI
             await new Promise(r => setTimeout(r, 500))
             updateItem(nextItem.id, { status: 'extracting', progress: 30 })
             
             // Extraktion (API Call)
             const formData = new FormData()
             formData.append('file', nextItem.file)
             
             // Wir nutzen hier fetch direkt auf die API
             // HINWEIS: Dies ersetzt die Logik in page.tsx nicht, sondern ergänzt sie.
             // Im MVP Code oben wurde extract-klausur separat aufgerufen.
             // Damit der Hook generisch bleibt, rufen wir eine Hilfsfunktion auf
             // oder machen den Fetch hier. 
             
             // Um den bestehenden Code nicht zu brechen, nutzen wir hier eine vereinfachte Logik:
             // Wir nehmen an, dass 'extracting' eigentlich 'processing' bedeutet.
        }

        // Falls wir eine externe Extract-Funktion haben (via Props):
        if (onExtractComplete && nextItem.file) {
            // Hier müssten wir eigentlich den Text extrahieren.
            // Da die Extraktionslogik komplex ist (Upload URL etc.), 
            // haben wir das meist in der Page. 
            // WICHTIG: Dein Page-Code macht den Upload VOR der Queue (teilweise) oder IN der Queue.
            // Da du onExtractComplete nutzt, muss der Hook den Text liefern.
            

            // FIX FÜR DEINEN FLOW:
            // Wir führen den Upload/Extrakt hier aus:
            

            // 1. Upload URL holen
            const urlRes = await fetch('/api/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: nextItem.fileName, fileType: nextItem.file.type, fileSize: nextItem.file.size })
            })
            if (!urlRes.ok) {
              throw new Error(
                await readApiErrorMessage(
                  urlRes,
                  'Der Upload der Datei konnte nicht vorbereitet werden. Bitte versuche es erneut.'
                )
              )
            }
            const { uploadUrl, fileKey } = await urlRes.json()
            
            // Speichere fileKey im Item
            updateItem(nextItem.id, { fileKey, status: 'extracting', progress: 60 })

            // 2. Upload zu S3
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              body: nextItem.file,
              headers: { 'Content-Type': nextItem.file.type },
            })
            if (!uploadResponse.ok) {
              throw new Error(
                normalizeStatusError(
                  uploadResponse.status,
                  '',
                  'Der Upload der Datei ist fehlgeschlagen. Bitte versuche es erneut.'
                )
              )
            }
            

            // 3. Extract Text
            const extRes = await fetch('/api/extract-klausur', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileKey })
            })
            if (!extRes.ok) {
              throw new Error(
                await readApiErrorMessage(
                  extRes,
                  'Die PDF konnte nicht gelesen werden. Bitte versuche es mit einer anderen Datei erneut.'
                )
              )
            }
            const extData = await extRes.json()
            if (
              extData?.error ||
              typeof extData?.text !== 'string' ||
              !extData.text.trim()
            ) {
              throw new Error(
                normalizeStatusError(
                  extRes.status,
                  typeof extData?.error === 'string' ? extData.error : '',
                  'Die PDF konnte nicht gelesen werden. Bitte versuche es mit einer anderen Datei erneut.'
                )
              )
            }
            
            // Callback mit Item inkl. fileKey aufrufen
            await onExtractComplete({ ...nextItem, fileKey }, extData.text)
        }

        // Status wird im onExtractComplete callback der Page auf 'analyzing' oder 'completed' gesetzt
        // Wir dekrementieren ActiveCount erst, wenn wir sicher durch sind
        

      } catch (error: any) {
        console.error("Queue Error:", error)
        updateItem(nextItem.id, {
          status: 'error',
          error: getUserFacingErrorMessage(
            error,
            'Die Datei konnte nicht verarbeitet werden. Bitte versuche es erneut.'
          ),
        })
      } finally {
        setActiveCount(prev => Math.max(0, prev - 1))
      }
    }

    processQueue()
  }, [queue, activeCount, maxConcurrent, updateItem, onExtractComplete])

  // Berechnete Werte
  const completedCount = queue.filter(i => ['completed', 'analyzing'].includes(i.status)).length
  const totalCount = queue.length
  // Einfache Average Progress Berechnung
  const totalProgress = totalCount === 0 ? 0 : Math.round(
    queue.reduce((acc, item) => acc + item.progress, 0) / totalCount
  )

  return {
    queue,
    activeCount,
    totalCount,
    completedCount,
    totalProgress,
    addToQueue,
    updateItem,
    removeItem,
    retryItem
  }
}



