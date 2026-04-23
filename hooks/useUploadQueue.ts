// hooks/useUploadQueue.ts
import { useState, useEffect, useRef, useCallback } from 'react'

import {
  getUserFacingErrorMessage,
  normalizeStatusError,
  readApiErrorMessage,
} from '@/lib/user-facing-errors'
import {
  getCachedExtraction,
  hashBrowserFile,
  storeCachedExtraction,
} from '@/lib/extraction-cache'

export interface QueueItem {
  id: string
  fileName: string
  file?: File
  status: 'pending' | 'uploading' | 'extracting' | 'analyzing' | 'completed' | 'error' | 'errorfinal'
  progress: number
  error?: string
  forceReanalysis?: boolean
  // Zusätzliche Felder für die Analyse
  correctionId?: string
  klausurText?: string
  erwartungshorizont?: string
  fileKey?: string | null // File Key aus Supabase Storage
  fileHash?: string | null
  textHash?: string | null
  // Zeit-Tracking für Live-Feedback (UploadProgressList)
  createdAt?: number       // ms-Timestamp beim Einreihen in die Queue
  phaseStartedAt?: number  // ms-Timestamp beim Start der aktuellen Phase (uploading/extracting/analyzing)
  phaseLabel?: 'uploading' | 'extracting' | 'analyzing' // Welche Phase der Counter gerade misst
}

interface UseUploadQueueProps {
  maxConcurrent?: number
  onExtractComplete?: (item: QueueItem, text: string) => Promise<void>
}

function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
        return
      }

      reject(
        new Error(
          normalizeStatusError(
            xhr.status,
            '',
            'Der Upload der Datei ist fehlgeschlagen. Bitte versuche es erneut.'
          )
        )
      )
    })

    xhr.addEventListener('error', () => {
      reject(
        new Error(
          'Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.'
        )
      )
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
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
    const nowTs = Date.now()
    const newQueueItems: QueueItem[] = uniqueItems.map(item => ({
      ...item,
      status: 'pending',
      progress: 0,
      createdAt: nowTs,
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
      updateItem(nextItem.id, {
        status: 'uploading',
        progress: 5,
        phaseStartedAt: Date.now(),
        phaseLabel: 'uploading',
      })

      try {
        // A) Upload Simulation / Logik
        // Hier gehen wir davon aus, dass das File-Objekt existiert
        if (!nextItem.file) {
            // Falls kein File-Objekt da ist (z.B. nur ID übergeben), überspringen wir direkt zu analyzing
            // oder werfen Fehler. Hier zur Sicherheit:
             updateItem(nextItem.id, { status: 'extracting', progress: 35 })
        } else {
             // Echter Upload Prozess würde hier passieren,
             // wir simulieren kurz den Upload-Step für die UI
             await new Promise(r => setTimeout(r, 500))
             updateItem(nextItem.id, { status: 'uploading', progress: 12 })
             
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
        if (onExtractComplete && (nextItem.file || nextItem.fileKey)) {
            const localFileHash = nextItem.file
              ? await hashBrowserFile(nextItem.file)
              : nextItem.fileHash ?? null
            // Hier müssten wir eigentlich den Text extrahieren.
            // Da die Extraktionslogik komplex ist (Upload URL etc.), 
            // haben wir das meist in der Page. 
            // WICHTIG: Dein Page-Code macht den Upload VOR der Queue (teilweise) oder IN der Queue.
            // Da du onExtractComplete nutzt, muss der Hook den Text liefern.
            

            // FIX FÜR DEINEN FLOW:
            // Wir führen den Upload/Extrakt hier aus:
            

            // 1. Upload URL holen
            let fileKey = nextItem.fileKey ?? null

            if (nextItem.file) {
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
              const uploadData = await urlRes.json()
              fileKey = uploadData.fileKey
              
              // Speichere fileKey im Item
              updateItem(nextItem.id, {
                fileKey,
                fileHash: localFileHash,
                status: 'uploading',
                progress: 18,
              })

              // 2. Upload zu S3
              await uploadFileWithProgress(uploadData.uploadUrl, nextItem.file, (percent) => {
                const mappedProgress = 18 + Math.round(percent * 0.27)
                updateItem(nextItem.id, {
                  status: 'uploading',
                  progress: Math.min(mappedProgress, 45),
                })
              })
            } else {
              updateItem(nextItem.id, {
                fileKey,
                fileHash: localFileHash,
                status: 'uploading',
                progress: 45,
              })
            }
            

            // 3. Extract Text
            updateItem(nextItem.id, {
              status: 'extracting',
              progress: 52,
              phaseStartedAt: Date.now(),
              phaseLabel: 'extracting',
            })
            const cachedExtraction = localFileHash ? getCachedExtraction(localFileHash) : null
            let extractedText: string
            let extractedTextHash: string | null
            let resolvedFileHash = localFileHash

            if (cachedExtraction) {
              extractedText = cachedExtraction.text
              extractedTextHash = cachedExtraction.textHash
              updateItem(nextItem.id, {
                status: 'extracting',
                progress: 64,
                textHash: extractedTextHash,
              })
            } else {
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

              extractedText = extData.text
              extractedTextHash =
                typeof extData?.textHash === 'string' ? extData.textHash : null
              resolvedFileHash =
                typeof extData?.fileHash === 'string' ? extData.fileHash : localFileHash

              if (extractedTextHash && resolvedFileHash) {
                storeCachedExtraction({
                  fileHash: resolvedFileHash,
                  fileName: nextItem.fileName,
                  text: extractedText,
                  textHash: extractedTextHash,
                  updatedAt: new Date().toISOString(),
                })
              }
            }
            updateItem(nextItem.id, { status: 'extracting', progress: 68 })
            
            // Callback mit Item inkl. fileKey aufrufen
            await onExtractComplete(
              {
                ...nextItem,
                fileKey,
                fileHash: resolvedFileHash ?? null,
                textHash: extractedTextHash,
              },
              extractedText
            )
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
