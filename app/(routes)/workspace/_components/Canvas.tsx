import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { FILE } from '../../dashboard/_components/FileList';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { configureForStylus } from './usePointerOptimization';
import StrokePreviewLayer from './StrokePreviewLayer';
import { useDebouncedSave } from './useDebouncedSave';

// Enable preview layer for extra-low latency (renders strokes immediately)
// This can be enabled if Excalidraw's native rendering is still too slow
const ENABLE_PREVIEW_LAYER = false;

// Auto-save debounce interval in milliseconds
const AUTO_SAVE_DEBOUNCE_MS = 2000;

function Canvas({onSaveTrigger,fileId,fileData}:{onSaveTrigger:any,fileId:any,fileData:FILE}) {

    const [whiteBoardData,setWhiteBoardData]=useState<any>();
    const excalidrawAPIRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wasDrawingRef = useRef(false);

    // Configure container for optimal stylus input
    useEffect(() => {
        if (containerRef.current) {
            configureForStylus(containerRef.current);
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
    <div ref={containerRef} className="relative" style={{ height: "670px", touchAction: 'none' }}>
   {/* Optional preview layer for extra-low latency stroke rendering */}
   {ENABLE_PREVIEW_LAYER && <StrokePreviewLayer enabled={true} />}
   {fileData&& <Excalidraw
    excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
    theme='light'
    initialData={{
        elements:fileData?.whiteboard&&JSON.parse(fileData?.whiteboard)
    }}
    onChange={handleChange}
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
