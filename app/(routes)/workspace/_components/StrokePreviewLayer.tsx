"use client"
import React, { useEffect, useRef, useCallback } from 'react'

interface Point {
  x: number
  y: number
  pressure: number
}

interface StrokePreviewLayerProps {
  enabled?: boolean
  strokeColor?: string
  strokeWidth?: number
}

/**
 * A lightweight canvas overlay that renders strokes immediately,
 * bypassing React's render cycle entirely.
 *
 * This provides instant visual feedback while Excalidraw processes
 * the stroke in the background. The preview is cleared when the
 * stroke is committed to Excalidraw.
 */
export function StrokePreviewLayer({
  enabled = true,
  strokeColor = '#1e1e1e',
  strokeWidth = 2
}: StrokePreviewLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const pointsRef = useRef<Point[]>([])
  const lastPointRef = useRef<Point | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Setup canvas context
  useEffect(() => {
    if (!enabled || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true, // Reduces latency by allowing independent rendering
    })

    if (ctx) {
      ctxRef.current = ctx
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
    }

    // Handle resize
    const handleResize = () => {
      if (canvas && ctx) {
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled, strokeColor, strokeWidth])

  // Render loop using requestAnimationFrame - NO SMOOTHING for instant feedback
  const render = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas || pointsRef.current.length < 1) {
      rafIdRef.current = null
      return
    }

    const points = pointsRef.current
    const lastRendered = lastPointRef.current

    // INSTANT RENDERING: Draw straight lines for zero latency
    // No smoothing, no curves - just direct point-to-point
    ctx.beginPath()

    const startPoint = lastRendered || points[0]
    ctx.moveTo(startPoint.x, startPoint.y)

    // Draw direct lines to each point - fastest possible rendering
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      ctx.lineTo(point.x, point.y)
    }

    ctx.stroke()

    // Remember last rendered point
    if (points.length > 0) {
      lastPointRef.current = points[points.length - 1]
    }

    // Clear processed points but keep last one for continuity
    pointsRef.current = points.length > 0 ? [points[points.length - 1]] : []

    rafIdRef.current = null
  }, [strokeWidth])

  // Schedule render on next animation frame
  const scheduleRender = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(render)
    }
  }, [render])

  // Clear the canvas
  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    pointsRef.current = []
    lastPointRef.current = null
  }, [])

  // Handle pointer events
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      // Handle all pointer types and mouse events
      // Only skip if not a primary button press
      if (e.button !== 0) return

      // Check if event is within our canvas area
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom) {
        return // Event is outside canvas
      }

      isDrawingRef.current = true
      pointsRef.current = []
      lastPointRef.current = null

      pointsRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: (e as PointerEvent).pressure || 0.5
      })
    }

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      if (!isDrawingRef.current) return
      // Check if primary button is still pressed
      if (!(e.buttons & 1)) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()

      // Process coalesced events for high-frequency input (pointer events only)
      const coalescedEvents = 'getCoalescedEvents' in e ? (e as PointerEvent).getCoalescedEvents?.() : null
      const events = coalescedEvents || [e]

      for (const event of events) {
        pointsRef.current.push({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          pressure: (event as PointerEvent).pressure || 0.5
        })
      }

      // Schedule render on next frame
      scheduleRender()
    }

    const handlePointerUp = () => {
      if (!isDrawingRef.current) return

      isDrawingRef.current = false

      // Flush any pending render
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        render()
      }

      // Clear preview after a short delay (let Excalidraw commit the stroke)
      setTimeout(clearCanvas, 100)
    }

    const handlePointerCancel = () => {
      isDrawingRef.current = false
      clearCanvas()
    }

    // Attach to document with capture phase for earliest possible interception
    const captureOptions = { passive: true, capture: true }
    document.addEventListener('pointerdown', handlePointerDown, captureOptions)
    document.addEventListener('pointermove', handlePointerMove, captureOptions)
    document.addEventListener('pointerup', handlePointerUp, captureOptions)
    document.addEventListener('pointercancel', handlePointerCancel, captureOptions)

    // Also listen to mouse events for Playwright compatibility
    document.addEventListener('mousedown', handlePointerDown as any, captureOptions)
    document.addEventListener('mousemove', handlePointerMove as any, captureOptions)
    document.addEventListener('mouseup', handlePointerUp as any, captureOptions)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, captureOptions)
      document.removeEventListener('pointermove', handlePointerMove, captureOptions)
      document.removeEventListener('pointerup', handlePointerUp, captureOptions)
      document.removeEventListener('pointercancel', handlePointerCancel, captureOptions)
      document.removeEventListener('mousedown', handlePointerDown as any, captureOptions)
      document.removeEventListener('mousemove', handlePointerMove as any, captureOptions)
      document.removeEventListener('mouseup', handlePointerUp as any, captureOptions)

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [enabled, scheduleRender, render, clearCanvas])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  )
}

export default StrokePreviewLayer
