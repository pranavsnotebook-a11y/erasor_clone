"use client"
import { useEffect } from 'react'

/**
 * Patches Excalidraw to use ultra-thin strokes by modifying
 * the stroke width values before rendering.
 *
 * Excalidraw uses these default widths:
 * - thin: 1
 * - bold: 2
 * - extraBold: 4
 *
 * This patch reduces them to:
 * - thin: 0.5
 * - bold: 1
 * - extraBold: 2
 */
export function ThinStrokePatch() {
  useEffect(() => {
    // Inject script to patch stroke widths
    const patchScript = `
      (function() {
        // Wait for Excalidraw to load
        const patchInterval = setInterval(() => {
          // Try to find and patch the canvas context
          const canvases = document.querySelectorAll('.excalidraw__canvas');
          if (canvases.length === 0) return;

          canvases.forEach(canvas => {
            if (canvas.__strokePatched) return;
            canvas.__strokePatched = true;

            // Get the 2D context
            const originalGetContext = canvas.getContext.bind(canvas);
            canvas.getContext = function(type, options) {
              const ctx = originalGetContext(type, options);
              if (type === '2d' && ctx && !ctx.__strokePatched) {
                ctx.__strokePatched = true;

                // Store original lineWidth setter
                const descriptor = Object.getOwnPropertyDescriptor(
                  CanvasRenderingContext2D.prototype,
                  'lineWidth'
                );

                if (descriptor && descriptor.set) {
                  const originalSet = descriptor.set;

                  // Override lineWidth to make strokes thinner
                  Object.defineProperty(ctx, 'lineWidth', {
                    get: descriptor.get,
                    set: function(value) {
                      // Scale down line widths
                      // thin (1) -> 0.5, bold (2) -> 1, extraBold (4) -> 2
                      const scaledValue = value * 0.5;
                      originalSet.call(this, Math.max(0.25, scaledValue));
                    },
                    configurable: true
                  });
                }
              }
              return ctx;
            };
          });

          // Stop checking after successful patch
          clearInterval(patchInterval);
          console.log('[ThinStrokePatch] Applied - strokes will be 50% thinner');
        }, 100);

        // Stop trying after 10 seconds
        setTimeout(() => clearInterval(patchInterval), 10000);
      })();
    `;

    const script = document.createElement('script');
    script.textContent = patchScript;
    document.head.appendChild(script);

    return () => {
      // Cleanup not really possible for this patch
    };
  }, []);

  return null;
}

export default ThinStrokePatch
