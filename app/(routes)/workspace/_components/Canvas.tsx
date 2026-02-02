import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { FILE } from '../../dashboard/_components/FileList';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { configureForStylus } from './usePointerOptimization';
import StrokePreviewLayer from './StrokePreviewLayer';
import { useDebouncedSave } from './useDebouncedSave';
import { applyRenderingOptimizations } from './useExcalidrawOptimization';
import AdaptivePointerHandler from './AdaptivePointerHandler';
import InstantStrokePreview from './InstantStrokePreview';
import ThinStrokePatch from './ThinStrokePatch';

// Enable instant preview for sub-10ms visual feedback
// Uses desynchronized canvas that renders independently of React/Excalidraw
const ENABLE_INSTANT_PREVIEW = true;

// Legacy preview layer disabled
const ENABLE_PREVIEW_LAYER = false;

// Auto-save debounce interval in milliseconds
const AUTO_SAVE_DEBOUNCE_MS = 2000;

function Canvas({onSaveTrigger,fileId,fileData}:{onSaveTrigger:any,fileId:any,fileData:FILE}) {

    const [whiteBoardData,setWhiteBoardData]=useState<any>();
    const excalidrawAPIRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wasDrawingRef = useRef(false);

    // Configure container for optimal stylus input and GPU acceleration
    useEffect(() => {
        if (containerRef.current) {
            configureForStylus(containerRef.current);
            // Apply GPU acceleration after Excalidraw mounts
            const timer = setTimeout(() => {
                if (containerRef.current) {
                    applyRenderingOptimizations(containerRef.current);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const updateWhiteboard=useMutation(api.files.updateWhiteboard)

    // Debounced auto-save for non-blocking persistence
    const { scheduleSave, saveNow } = useDebouncedSave({
        debounceMs: AUTO_SAVE_DEBOUNCE_MS,
        onSave: async (elements) => {
            if (elements && fileId) {
                await updateWhiteboard({
                    _id: fileId,
                    whiteboard: JSON.stringify(elements)
                })
            }
        },
        onSaveStart: () => {
            // Could add visual indicator here
        },
        onSaveEnd: (success) => {
            if (success) {
                console.log('Auto-saved whiteboard')
            }
        }
    })

    // Handle explicit save trigger from header button
    useEffect(()=>{
        if (onSaveTrigger) {
            saveWhiteboard();
        }
    },[onSaveTrigger])

    const saveWhiteboard=()=>{
        // Get current elements from API if available
        const elements = excalidrawAPIRef.current?.getSceneElements() || whiteBoardData;
        if (elements) {
            // Use immediate save for explicit save action
            saveNow(elements)
        }
    }

    // Ultra-optimized onChange handler - minimal work during drawing
    const handleChange = useCallback((excalidrawElements: any, appState: any, files: any) => {
        // FAST PATH: Check drawing state with minimal property access
        const dragging = appState?.draggingElement;

        if (dragging !== null) {
            // DRAWING IN PROGRESS - Do absolutely nothing except mark state
            // This is the hot path - must be as fast as possible
            wasDrawingRef.current = true;
            return; // Exit immediately - don't store, don't process
        }

        // NOT DRAWING - Check if we just finished a stroke
        if (wasDrawingRef.current) {
            // Stroke just completed
            wasDrawingRef.current = false;

            // Use requestIdleCallback for non-critical updates
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(() => {
                    setWhiteBoardData(excalidrawElements);
                    scheduleSave(excalidrawElements);
                }, { timeout: 100 });
            } else {
                // Fallback: defer to next frame
                requestAnimationFrame(() => {
                    setWhiteBoardData(excalidrawElements);
                    scheduleSave(excalidrawElements);
                });
            }
        } else {
            // Non-drawing change (undo, redo, tool change, etc.)
            setWhiteBoardData(excalidrawElements);
            scheduleSave(excalidrawElements);
        }
    }, [scheduleSave]);


    return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        height: "670px",
        touchAction: 'none',
        // GPU acceleration hints
        willChange: 'transform',
        transform: 'translateZ(0)',
        isolation: 'isolate',
        contain: 'layout style paint'
      }}
    >
   {/* Patches to make strokes 50% thinner than default */}
   <ThinStrokePatch />
   {/* Instant preview layer for sub-10ms visual feedback */}
   {ENABLE_INSTANT_PREVIEW && <InstantStrokePreview />}
   {/* Legacy preview layer */}
   {ENABLE_PREVIEW_LAYER && <StrokePreviewLayer enabled={true} />}
   {fileData&& <Excalidraw
    excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
    theme='light'
    initialData={{
        elements:fileData?.whiteboard&&JSON.parse(fileData?.whiteboard),
        appState: {
            // Ultra-thin stroke by default (thinner than Excalidraw's "thin" which is 1)
            currentItemStrokeWidth: 0.5,
            // Start with freedraw tool selected
            activeTool: { type: 'freedraw', lastActiveTool: null, locked: false, customType: null },
        }
    }}
    onChange={handleChange}
    detectScroll={false}
    handleKeyboardGlobally={false}
    UIOptions={{
        canvasActions:{
            saveToActiveFile:false,
            loadScene:false,
            export:false,
            toggleTheme:false
        }
    }}
    >
        <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas/>
            <MainMenu.DefaultItems.SaveAsImage/>
            <MainMenu.DefaultItems.ChangeCanvasBackground/>
        </MainMenu>
        <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint/>
            <WelcomeScreen.Hints.MenuHint/>
            <WelcomeScreen.Hints.ToolbarHint/>
            <WelcomeScreen.Center>
                <WelcomeScreen.Center.MenuItemHelp/>
            </WelcomeScreen.Center>
        </WelcomeScreen>
        </Excalidraw>}
  </div>
  )
}

export default Canvas
