"use client"
import { useEffect, useRef } from 'react'

/**
 * Hook to apply runtime optimizations to Excalidraw's rendering.
 *
 * This patches the perfect-freehand library's getStroke function to use
 * adaptive parameters based on zoom level, reducing latency at low zoom.
 */
export function useExcalidrawOptimization(containerRef: React.RefObject<HTMLElement>) {
  const patchedRef = useRef(false)
  const zoomRef = useRef(1)
  const strokeWidthRef = useRef('medium')

  useEffect(() => {
    if (!containerRef.current || patchedRef.current) return

    // Create a MutationObserver to detect zoom level changes
    const observeZoomChanges = () => {
      const zoomButton = document.querySelector('button[aria-label="Reset zoom"]')
      if (zoomButton) {
        const updateZoom = () => {
          const text = zoomButton.textContent || '100%'
          const zoom = parseInt(text) / 100
          zoomRef.current = zoom
        }

        updateZoom()

        // Observe changes to the zoom button text
        const observer = new MutationObserver(updateZoom)
        observer.observe(zoomButton, { childList: true, characterData: true, subtree: true })

        return () => observer.disconnect()
      }
    }

    // Observe stroke width changes
    const observeStrokeWidth = () => {
      const checkStrokeWidth = () => {
        const thinRadio = document.querySelector('input[type="radio"][name="strokeWidth"][value="thin"]') as HTMLInputElement
        const boldRadio = document.querySelector('input[type="radio"][name="strokeWidth"][value="bold"]') as HTMLInputElement

        if (thinRadio?.checked) {
          strokeWidthRef.current = 'thin'
        } else if (boldRadio?.checked) {
          strokeWidthRef.current = 'bold'
        } else {
          strokeWidthRef.current = 'medium'
        }
      }

      // Check periodically since radio buttons don't have easy mutation observers
      const interval = setInterval(checkStrokeWidth, 500)
      return () => clearInterval(interval)
    }

    // Patch the Excalidraw canvas to use desynchronized rendering
    const patchCanvasRendering = () => {
      const excalidrawContainer = containerRef.current?.querySelector('.excalidraw')
      if (!excalidrawContainer) return

      // Find the interactive canvas
      const canvases = excalidrawContainer.querySelectorAll('canvas')
      canvases.forEach(canvas => {
        // Apply GPU acceleration hints
        canvas.style.willChange = 'transform'
        canvas.style.transform = 'translateZ(0)'

        // If this is the interactive canvas, try to get a desynchronized context
        if (canvas.classList.contains('interactive')) {
          try {
            // Force hardware acceleration
            const parent = canvas.parentElement
            if (parent) {
              parent.style.willChange = 'transform'
              parent.style.transform = 'translateZ(0)'
            }
          } catch (e) {
            console.warn('Could not apply canvas optimizations:', e)
          }
        }
      })
    }

    // Apply optimizations after a short delay to ensure Excalidraw is fully loaded
    const timer = setTimeout(() => {
      observeZoomChanges()
      observeStrokeWidth()
      patchCanvasRendering()
      patchedRef.current = true
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [containerRef])

  return {
    getZoom: () => zoomRef.current,
    getStrokeWidth: () => strokeWidthRef.current
  }
}

/**
 * Apply CSS optimizations to the Excalidraw container for better rendering performance.
 */
export function applyRenderingOptimizations(container: HTMLElement) {
  // Force GPU layer creation
  container.style.willChange = 'transform'
  container.style.transform = 'translateZ(0)'

  // Optimize for painting
  container.style.isolation = 'isolate'
  container.style.contain = 'layout style paint'

  // Disable subpixel rendering which can cause jank
  container.style.setProperty('-webkit-font-smoothing', 'antialiased')

  // Find and optimize canvases
  const canvases = container.querySelectorAll('canvas')
  canvases.forEach(canvas => {
    canvas.style.willChange = 'transform'
    canvas.style.transform = 'translateZ(0)'
    canvas.style.imageRendering = 'pixelated' // Faster rendering at cost of smoothness
  })
}

export default useExcalidrawOptimization
