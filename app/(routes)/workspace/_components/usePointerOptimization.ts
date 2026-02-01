"use client"
import { useEffect, useRef, useCallback } from 'react'

interface PointerOptimizationOptions {
  onCoalescedPoints?: (points: { x: number; y: number; pressure: number; timestamp: number }[]) => void
  onDrawStart?: () => void
  onDrawEnd?: () => void
  targetElement?: HTMLElement | null
}

/**
 * Hook to optimize pointer event handling for low-latency stylus input.
 *
 * Features:
 * - Uses Pointer Events API for unified touch/pen/mouse handling
 * - Processes coalesced events to capture all stylus points between frames
 * - Operates independently of React render cycle
 * - Tracks drawing state for coordination with other components
 */
export function usePointerOptimization(options: PointerOptimizationOptions = {}) {
  const { onCoalescedPoints, onDrawStart, onDrawEnd, targetElement } = options

  const isDrawingRef = useRef(false)
  const pointsBufferRef = useRef<{ x: number; y: number; pressure: number; timestamp: number }[]>([])
  const lastProcessedTimeRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

  // Process buffered points outside of event handlers
  const flushPointsBuffer = useCallback(() => {
    if (pointsBufferRef.current.length > 0 && onCoalescedPoints) {
      onCoalescedPoints([...pointsBufferRef.current])
      pointsBufferRef.current = []
    }
    rafIdRef.current = null
  }, [onCoalescedPoints])

  // Schedule point processing on next animation frame
  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushPointsBuffer)
    }
  }, [flushPointsBuffer])

  useEffect(() => {
    const element = targetElement || document

    const handlePointerDown = (e: PointerEvent) => {
      // Only track pen and touch for drawing
      if (e.pointerType !== 'pen' && e.pointerType !== 'touch') return

      isDrawingRef.current = true
      pointsBufferRef.current = []
      lastProcessedTimeRef.current = e.timeStamp

      // Add initial point
      pointsBufferRef.current.push({
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure,
        timestamp: e.timeStamp
      })

      onDrawStart?.()
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      if (e.pointerType !== 'pen' && e.pointerType !== 'touch') return

      // Get all coalesced events for high-frequency stylus input
      // This captures points that would otherwise be lost between frames
      const coalescedEvents = e.getCoalescedEvents?.() || [e]

      for (const event of coalescedEvents) {
        pointsBufferRef.current.push({
          x: event.clientX,
          y: event.clientY,
          pressure: event.pressure,
          timestamp: event.timeStamp
        })
      }

      // Schedule processing on next animation frame
      scheduleFlush()
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return

      isDrawingRef.current = false

      // Flush any remaining points
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      flushPointsBuffer()

      onDrawEnd?.()
    }

    const handlePointerCancel = (e: PointerEvent) => {
      isDrawingRef.current = false
      pointsBufferRef.current = []

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      onDrawEnd?.()
    }

    // Use passive listeners for better scroll performance
    // but we still capture the events for processing
    const options = { passive: true, capture: true }

    element.addEventListener('pointerdown', handlePointerDown as EventListener, options)
    element.addEventListener('pointermove', handlePointerMove as EventListener, options)
    element.addEventListener('pointerup', handlePointerUp as EventListener, options)
    element.addEventListener('pointercancel', handlePointerCancel as EventListener, options)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown as EventListener, options)
      element.removeEventListener('pointermove', handlePointerMove as EventListener, options)
      element.removeEventListener('pointerup', handlePointerUp as EventListener, options)
      element.removeEventListener('pointercancel', handlePointerCancel as EventListener, options)

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [targetElement, onDrawStart, onDrawEnd, scheduleFlush, flushPointsBuffer])

  return {
    isDrawing: () => isDrawingRef.current,
    getBufferedPointCount: () => pointsBufferRef.current.length
  }
}

/**
 * Utility to check if coalesced events are supported
 */
export function supportsCoalescedEvents(): boolean {
  return typeof PointerEvent !== 'undefined' &&
         'getCoalescedEvents' in PointerEvent.prototype
}

/**
 * Utility to configure touch-action for optimal stylus input
 */
export function configureForStylus(element: HTMLElement) {
  // Disable browser gestures on the canvas area
  element.style.touchAction = 'none'

  // Prevent default touch behaviors
  element.style.setProperty('-webkit-touch-callout', 'none')
  element.style.setProperty('-webkit-user-select', 'none')
  element.style.setProperty('user-select', 'none')

  // Enable high-frequency pointer events if supported
  if ('style' in element) {
    // @ts-ignore - experimental property
    element.style.touchAction = 'none'
  }
}

export default usePointerOptimization
