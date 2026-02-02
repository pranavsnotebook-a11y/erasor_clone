"use client"
import { useEffect, useRef, useCallback } from 'react'

interface AdaptivePointerHandlerProps {
  enabled?: boolean
  containerRef: React.RefObject<HTMLElement>
  /**
   * Minimum distance between points in pixels.
   * Higher values = fewer points = faster rendering but less detail.
   * This is scaled by zoom level - at 50% zoom, effective distance doubles.
   */
  minPointDistance?: number
}

/**
 * Intercepts pointer events and decimates points based on zoom level.
 *
 * When zoomed out, visual detail is less important but Excalidraw still
 * processes all points. This handler reduces point density proportionally
 * to zoom level, improving performance at low zoom.
 *
 * The handler operates at the capture phase to intercept events before
 * Excalidraw receives them.
 */
export function AdaptivePointerHandler({
  enabled = true,
  containerRef,
  minPointDistance = 2
}: AdaptivePointerHandlerProps) {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const isDrawingRef = useRef(false)
  const zoomRef = useRef(1)
  const strokeWidthRef = useRef<'thin' | 'medium' | 'bold'>('medium')

  // Calculate effective minimum distance based on zoom and stroke width
  const getEffectiveMinDistance = useCallback(() => {
    const zoom = zoomRef.current
    const strokeMultiplier = strokeWidthRef.current === 'thin' ? 1.5 :
                             strokeWidthRef.current === 'bold' ? 0.5 : 1

    // At 100% zoom: minPointDistance
    // At 50% zoom: minPointDistance * 2
    // At 25% zoom: minPointDistance * 4
    const zoomMultiplier = 1 / Math.max(zoom, 0.1)

    return minPointDistance * zoomMultiplier * strokeMultiplier
  }, [minPointDistance])

  // Check if a new point should be processed or skipped
  const shouldProcessPoint = useCallback((x: number, y: number) => {
    if (!lastPointRef.current) {
      lastPointRef.current = { x, y }
      return true
    }

    const dx = x - lastPointRef.current.x
    const dy = y - lastPointRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const minDist = getEffectiveMinDistance()

    if (distance >= minDist) {
      lastPointRef.current = { x, y }
      return true
    }

    return false
  }, [getEffectiveMinDistance])

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current

    // Monitor zoom level changes
    const updateZoom = () => {
      const zoomButton = document.querySelector('button[aria-label="Reset zoom"]')
      if (zoomButton) {
        const text = zoomButton.textContent || '100%'
        zoomRef.current = parseInt(text) / 100
      }
    }

    // Monitor stroke width changes
    const updateStrokeWidth = () => {
      const thinSelected = document.querySelector('[title*="Thin"][aria-checked="true"], [title="Thin"] input:checked')
      const boldSelected = document.querySelector('[title*="Bold"][aria-checked="true"], [title="Bold"] input:checked')
      const extraBoldSelected = document.querySelector('[title*="Extra bold"][aria-checked="true"]')

      if (thinSelected) {
        strokeWidthRef.current = 'thin'
      } else if (boldSelected || extraBoldSelected) {
        strokeWidthRef.current = 'bold'
      } else {
        strokeWidthRef.current = 'medium'
      }
    }

    // Handle pointer down - start of a new stroke
    const handlePointerDown = (e: PointerEvent) => {
      // Only intercept for drawing (primary button)
      if (e.button !== 0) return

      isDrawingRef.current = true
      lastPointRef.current = null
      updateZoom()
      updateStrokeWidth()
    }

    // Handle pointer move - decimate points if needed
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      if (!(e.buttons & 1)) return // Not drawing

      // Check if we should skip this point
      if (!shouldProcessPoint(e.clientX, e.clientY)) {
        // Stop propagation to prevent Excalidraw from processing this point
        e.stopPropagation()
      }
    }

    // Handle pointer up - end of stroke
    const handlePointerUp = () => {
      isDrawingRef.current = false
      lastPointRef.current = null
    }

    // Use capture phase to intercept before Excalidraw
    container.addEventListener('pointerdown', handlePointerDown, { capture: true })
    container.addEventListener('pointermove', handlePointerMove, { capture: true })
    container.addEventListener('pointerup', handlePointerUp, { capture: true })
    container.addEventListener('pointercancel', handlePointerUp, { capture: true })

    // Initial update
    updateZoom()
    updateStrokeWidth()

    // Periodically update zoom and stroke width
    const interval = setInterval(() => {
      updateZoom()
      updateStrokeWidth()
    }, 1000)

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      container.removeEventListener('pointermove', handlePointerMove, { capture: true })
      container.removeEventListener('pointerup', handlePointerUp, { capture: true })
      container.removeEventListener('pointercancel', handlePointerUp, { capture: true })
      clearInterval(interval)
    }
  }, [enabled, containerRef, shouldProcessPoint])

  return null
}

export default AdaptivePointerHandler
