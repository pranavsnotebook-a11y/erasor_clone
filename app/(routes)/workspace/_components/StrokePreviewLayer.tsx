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

  // Render loop using requestAnimationFrame
  const render = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas || pointsRef.current.length < 2) {
      rafIdRef.current = null
      return
    }

    // Draw new points since last render
    const points = pointsRef.current
    const lastRendered = lastPointRef.current

    ctx.beginPath()

    if (lastRendered) {
      ctx.moveTo(lastRendered.x, lastRendered.y)
    } else {
      ctx.moveTo(points[0].x, points[0].y)
    }

    // Draw smooth curve through points
    for (let i = lastRendered ? 0 : 1; i < points.length; i++) {
      const point = points[i]
      const prevPoint = i > 0 ? points[i - 1] : lastRendered || points[0]

      // Use quadratic curve for smoother lines
      const midX = (prevPoint.x + point.x) / 2
      const midY = (prevPoint.y + point.y) / 2

      ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY)

      // Vary line width based on pressure
      if (point.pressure > 0) {
        ctx.lineWidth = strokeWidth * (0.5 + point.pressure * 0.5)
      }
    }

    ctx.stroke()

    // Remember last rendered point
    if (points.length > 0) {
      lastPointRef.current = points[points.length - 1]
    }

    // Clear processed points but keep last one for continuity
    if (points.length > 1) {
      pointsRef.current = [points[points.length - 1]]
    }

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

    const handlePointerDown = (e: PointerEvent) => {
      // Handle all pointer types (pen, touch, mouse) for drawing
      // Only skip if not a primary button press for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return

      isDrawingRef.current = true
      pointsRef.current = []
      lastPointRef.current = null

      // Get position relative to canvas
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        pointsRef.current.push({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: e.pressure || 0.5 // Default pressure for mouse
        })
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      // For mouse, check if primary button is still pressed
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()

      // Process coalesced events for high-frequency input
      const events = e.getCoalescedEvents?.() || [e]

      for (const event of events) {
        pointsRef.current.push({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          pressure: event.pressure || 0.5 // Default pressure for mouse
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
      setTimeout(clearCanvas, 50)
    }

    const handlePointerCancel = () => {
      isDrawingRef.current = false
      clearCanvas()
    }

    // Attach to document for global capture
    document.addEventListener('pointerdown', handlePointerDown, { passive: true })
    document.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerup', handlePointerUp, { passive: true })
    document.addEventListener('pointercancel', handlePointerCancel, { passive: true })

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerCancel)

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
