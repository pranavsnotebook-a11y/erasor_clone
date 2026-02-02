"use client"
import { useEffect, useRef } from 'react'

/**
 * InstantStrokePreview - Sub-frame latency stroke rendering
 *
 * This component creates a desynchronized canvas overlay that renders
 * strokes INSTANTLY on pointer events, completely bypassing React's
 * render cycle and even the browser's compositor in supported browsers.
 *
 * The desynchronized hint allows the canvas to update independently
 * of the main thread, achieving sub-10ms input-to-pixel latency.
 */
export function InstantStrokePreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const isDrawToolActiveRef = useRef(false)

  useEffect(() => {
    // Create canvas element directly in DOM for minimum overhead
    const canvas = document.createElement('canvas')
    canvas.id = 'instant-stroke-preview'
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      touch-action: none;
    `
    canvasRef.current = canvas

    // Find the Excalidraw container and append canvas
    const findAndAttach = () => {
      const excalidrawContainer = document.querySelector('.excalidraw')
      if (excalidrawContainer) {
        excalidrawContainer.appendChild(canvas)

        // Setup canvas with desynchronized context for lowest latency
        const rect = excalidrawContainer.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        // Request desynchronized context - this is key for sub-frame latency
        const ctx = canvas.getContext('2d', {
          alpha: true,
          desynchronized: true, // Allows independent GPU rendering
          willReadFrequently: false,
        })

        if (ctx) {
          ctx.scale(dpr, dpr)
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.strokeStyle = '#1e1e1e'
          ctx.lineWidth = 2
          ctxRef.current = ctx
        }

        return true
      }
      return false
    }

    // Try to attach immediately, retry if Excalidraw hasn't mounted
    if (!findAndAttach()) {
      const interval = setInterval(() => {
        if (findAndAttach()) {
          clearInterval(interval)
        }
      }, 100)

      setTimeout(() => clearInterval(interval), 5000)
    }

    // Monitor tool changes
    const checkDrawTool = () => {
      const drawToolSelected = document.querySelector('[title*="Draw"][aria-checked="true"], [title="Draw — P or 7"] input:checked, .ToolIcon_type_freedraw--selected')
      isDrawToolActiveRef.current = !!drawToolSelected ||
        !!document.querySelector('input[value="freedraw"]:checked') ||
        !!document.querySelector('[data-testid="toolbar-freedraw"][aria-selected="true"]')
    }

    // Get current stroke settings from Excalidraw
    const getStrokeSettings = () => {
      // Try to get stroke color from Excalidraw's state
      const colorPicker = document.querySelector('[data-testid="color-stroke"] .active, .color-picker-content--stroke .color-picker-swatch--selected')
      let color = '#1e1e1e'
      if (colorPicker) {
        const bg = window.getComputedStyle(colorPicker).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)') color = bg
      }

      // Get stroke width - default to ultra-thin (0.5)
      let width = 0.5
      const boldSelected = document.querySelector('[title*="Bold"][aria-checked="true"]')
      const extraBoldSelected = document.querySelector('[title*="Extra bold"][aria-checked="true"]')
      if (extraBoldSelected) width = 4
      else if (boldSelected) width = 2

      return { color, width }
    }

    // CRITICAL: Direct pointer event handling for minimum latency
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return

      checkDrawTool()
      if (!isDrawToolActiveRef.current) return

      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Update stroke settings
      const settings = getStrokeSettings()
      ctx.strokeStyle = settings.color
      ctx.lineWidth = settings.width

      isDrawingRef.current = true
      lastPointRef.current = { x, y }

      // Draw initial dot
      ctx.beginPath()
      ctx.arc(x, y, settings.width / 2, 0, Math.PI * 2)
      ctx.fillStyle = settings.color
      ctx.fill()
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      if (!(e.buttons & 1)) return

      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx || !lastPointRef.current) return

      const rect = canvas.getBoundingClientRect()

      // Process coalesced events for high-frequency input
      const events = e.getCoalescedEvents?.() || [e]

      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)

      for (const event of events) {
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        ctx.lineTo(x, y)
        lastPointRef.current = { x, y }
      }

      ctx.stroke()
    }

    const handlePointerUp = () => {
      if (!isDrawingRef.current) return

      isDrawingRef.current = false
      lastPointRef.current = null

      // Clear preview after Excalidraw commits (small delay)
      setTimeout(() => {
        const ctx = ctxRef.current
        const canvas = canvasRef.current
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }, 50)
    }

    // Attach handlers at capture phase for earliest interception
    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true })
    document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true })
    document.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true })
    document.addEventListener('pointercancel', handlePointerUp, { capture: true, passive: true })

    // Periodically check tool state
    const toolCheckInterval = setInterval(checkDrawTool, 500)

    // Handle resize
    const handleResize = () => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return

      const parent = canvas.parentElement
      if (!parent) return

      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      document.removeEventListener('pointermove', handlePointerMove, { capture: true })
      document.removeEventListener('pointerup', handlePointerUp, { capture: true })
      document.removeEventListener('pointercancel', handlePointerUp, { capture: true })
      window.removeEventListener('resize', handleResize)
      clearInterval(toolCheckInterval)

      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.parentElement.removeChild(canvasRef.current)
      }
    }
  }, [])

  return null // No React rendering - all DOM manipulation is direct
}

export default InstantStrokePreview
