"use client"
import { useRef, useCallback, useEffect } from 'react'

interface DebouncedSaveOptions {
  /** Minimum time between saves in milliseconds */
  debounceMs?: number
  /** Callback to execute the save */
  onSave: (data: any) => Promise<void> | void
  /** Called when save starts (for UI feedback) */
  onSaveStart?: () => void
  /** Called when save completes */
  onSaveEnd?: (success: boolean) => void
}

/**
 * Hook for debounced, non-blocking persistence.
 *
 * Features:
 * - Debounces saves to prevent excessive API calls
 * - Saves run in background without blocking render
 * - Coalesces rapid changes into single save
 * - Tracks dirty state for unsaved changes
 */
export function useDebouncedSave({
  debounceMs = 2000,
  onSave,
  onSaveStart,
  onSaveEnd
}: DebouncedSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef(0)
  const pendingDataRef = useRef<any>(null)
  const isSavingRef = useRef(false)
  const isDirtyRef = useRef(false)

  // Execute save in background
  const executeSave = useCallback(async (data: any) => {
    if (isSavingRef.current) {
      // Save already in progress, queue this data
      pendingDataRef.current = data
      return
    }

    isSavingRef.current = true
    onSaveStart?.()

    try {
      // Use requestIdleCallback if available for true background execution
      // Otherwise, use setTimeout to defer to next tick
      await new Promise<void>((resolve) => {
        const doSave = async () => {
          try {
            await onSave(data)
            lastSaveTimeRef.current = Date.now()
            isDirtyRef.current = false
            resolve()
          } catch (error) {
            console.error('Save failed:', error)
            resolve()
          }
        }

        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(doSave, { timeout: 1000 })
        } else {
          setTimeout(doSave, 0)
        }
      })

      onSaveEnd?.(true)
    } catch (error) {
      onSaveEnd?.(false)
    } finally {
      isSavingRef.current = false

      // If there's pending data, save it
      if (pendingDataRef.current) {
        const pending = pendingDataRef.current
        pendingDataRef.current = null
        scheduleSave(pending)
      }
    }
  }, [onSave, onSaveStart, onSaveEnd])

  // Schedule a debounced save
  const scheduleSave = useCallback((data: any) => {
    isDirtyRef.current = true
    pendingDataRef.current = data

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Calculate delay based on last save time
    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current
    const delay = Math.max(0, debounceMs - timeSinceLastSave)

    timeoutRef.current = setTimeout(() => {
      const dataToSave = pendingDataRef.current
      pendingDataRef.current = null
      timeoutRef.current = null

      if (dataToSave) {
        executeSave(dataToSave)
      }
    }, delay)
  }, [debounceMs, executeSave])

  // Immediate save (for explicit save actions)
  const saveNow = useCallback((data: any) => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    pendingDataRef.current = null

    return executeSave(data)
  }, [executeSave])

  // Flush any pending changes before unmount
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (pendingDataRef.current && !isSavingRef.current) {
      const data = pendingDataRef.current
      pendingDataRef.current = null
      // Synchronous save on flush (before unmount)
      onSave(data)
    }
  }, [onSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Attempt to flush on unmount
      if (pendingDataRef.current) {
        onSave(pendingDataRef.current)
      }
    }
  }, [onSave])

  return {
    /** Schedule a debounced save */
    scheduleSave,
    /** Execute immediate save */
    saveNow,
    /** Flush pending changes */
    flush,
    /** Check if there are unsaved changes */
    isDirty: () => isDirtyRef.current,
    /** Check if save is in progress */
    isSaving: () => isSavingRef.current
  }
}

export default useDebouncedSave
