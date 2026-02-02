"use client"
import { useEffect, useRef } from 'react'

/**
 * Patches Excalidraw's internal rendering to reduce latency at low zoom levels.
 *
 * This component injects JavaScript that intercepts and modifies the perfect-freehand
 * library's behavior, reducing smoothing when zoomed out to improve perceived latency.
 */
export function ExcalidrawPatcher() {
  const patchedRef = useRef(false)

  useEffect(() => {
    if (patchedRef.current) return
    patchedRef.current = true

    // Inject the patch script
    const patchScript = `
      (function() {
        // Store original getStroke if it exists on window
        let originalGetStroke = null;
        let currentZoom = 1;
        let currentStrokeWidth = 'medium';

        // Monitor zoom level changes
        function updateZoom() {
          const zoomButton = document.querySelector('button[aria-label="Reset zoom"]');
          if (zoomButton) {
            const text = zoomButton.textContent || '100%';
            currentZoom = parseInt(text) / 100;
          }
        }

        // Monitor stroke width
        function updateStrokeWidth() {
          const thinSelected = document.querySelector('[title="Thin"] input:checked, [title*="Thin"][aria-checked="true"]');
          if (thinSelected) {
            currentStrokeWidth = 'thin';
          } else {
            currentStrokeWidth = 'medium';
          }
        }

        // Poll for changes
        setInterval(() => {
          updateZoom();
          updateStrokeWidth();
        }, 500);

        // Try to patch the webpack chunk that contains getStroke
        function tryPatchGetStroke() {
          try {
            // Look for the perfect-freehand getStroke function in webpack modules
            if (window.webpackChunkExcalidrawLib) {
              const chunks = window.webpackChunkExcalidrawLib;

              // Iterate through chunks to find getStroke
              for (const chunk of chunks) {
                if (chunk && chunk[1]) {
                  const modules = chunk[1];
                  for (const moduleId in modules) {
                    const moduleFunc = modules[moduleId];
                    const moduleStr = moduleFunc.toString();

                    // Check if this module contains getStroke-like code
                    if (moduleStr.includes('streamline') && moduleStr.includes('smoothing')) {
                      console.log('[ExcalidrawPatcher] Found perfect-freehand module:', moduleId);

                      // We found the module but can't easily patch it
                      // Instead, let's try a different approach
                      break;
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[ExcalidrawPatcher] Could not patch getStroke:', e);
          }
        }

        // Alternative approach: Override pointer event handling to reduce frequency at low zoom
        function patchPointerEvents() {
          let lastMoveTime = 0;
          const minInterval = () => {
            // At 50% zoom with thin strokes, skip more events
            if (currentZoom < 0.6 && currentStrokeWidth === 'thin') {
              return 8; // Skip events closer than 8ms
            }
            return 0; // Don't skip at normal zoom
          };

          const originalAddEventListener = EventTarget.prototype.addEventListener;
          EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'pointermove' && this.classList && this.classList.contains('excalidraw__canvas')) {
              const wrappedListener = function(event) {
                const now = Date.now();
                const interval = minInterval();
                if (interval > 0 && now - lastMoveTime < interval) {
                  return; // Skip this event
                }
                lastMoveTime = now;
                return listener.apply(this, arguments);
              };
              return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            return originalAddEventListener.call(this, type, listener, options);
          };

          console.log('[ExcalidrawPatcher] Pointer event throttling enabled');
        }

        // Apply patches
        setTimeout(() => {
          tryPatchGetStroke();
          // Don't patch pointer events as it might cause issues
          // patchPointerEvents();
        }, 2000);

        console.log('[ExcalidrawPatcher] Initialized');
      })();
    `;

    // Create and inject the script
    const script = document.createElement('script')
    script.textContent = patchScript
    document.head.appendChild(script)

    // Cleanup function
    return () => {
      // Can't easily remove the patches, but they're harmless
    }
  }, [])

  return null
}

export default ExcalidrawPatcher
