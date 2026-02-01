import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
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
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const isDrawingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pendingElementsRef = useRef<any>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

    // Sync pending elements to React state (called after drawing ends)
    const syncPendingElements = useCallback(() => {
        if (pendingElementsRef.current) {
            setWhiteBoardData(pendingElementsRef.current);
            pendingElementsRef.current = null;
        }
    }, []);

    // Optimized onChange handler - defers React state sync during drawing
    const handleChange = useCallback((excalidrawElements: any, appState: any, files: any) => {
        // Detect drawing state from Excalidraw's appState
        const isCurrentlyDrawing = appState?.draggingElement !== null ||
                                   appState?.resizingElement !== null ||
                                   appState?.isResizing ||
                                   appState?.isRotating ||
                                   appState?.editingElement !== null;

        isDrawingRef.current = isCurrentlyDrawing;

        if (isCurrentlyDrawing) {
            // Store elements but don't sync to React during drawing
            // This completely eliminates React re-renders while drawing
            pendingElementsRef.current = excalidrawElements;
            wasDrawingRef.current = true;

            // Clear any pending sync timeout
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
        } else {
            // Drawing just ended or this is a non-drawing change
            if (wasDrawingRef.current) {
                // Stroke just completed - sync after a micro-delay
                // This ensures Excalidraw has fully committed the stroke
                wasDrawingRef.current = false;
                pendingElementsRef.current = excalidrawElements;

                syncTimeoutRef.current = setTimeout(() => {
                    syncPendingElements();
                    syncTimeoutRef.current = null;

                    // Schedule auto-save after stroke completion
                    // This runs in background without blocking render
                    scheduleSave(excalidrawElements);
                }, 16); // One frame delay
            } else {
                // Non-drawing change (undo, redo, tool change, etc.)
                // Sync immediately for responsive UI
                setWhiteBoardData(excalidrawElements);

                // Schedule auto-save for non-drawing changes too
                scheduleSave(excalidrawElements);
            }
        }
    }, [syncPendingElements, scheduleSave]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full"
        style={{
          minHeight: '400px',
          touchAction: 'none',
          overflow: 'hidden'
        }}
      >
        {/* Optional preview layer for extra-low latency stroke rendering */}
        {ENABLE_PREVIEW_LAYER && <StrokePreviewLayer enabled={true} />}
        {fileData && <Excalidraw
          excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
          theme='light'
          initialData={{
            elements: fileData?.whiteboard && JSON.parse(fileData?.whiteboard)
          }}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: false
            }
          }}
        >
          {/* Custom empty WelcomeScreen to completely disable all hints */}
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint>
              <></>
            </WelcomeScreen.Hints.MenuHint>
            <WelcomeScreen.Hints.ToolbarHint>
              <></>
            </WelcomeScreen.Hints.ToolbarHint>
            <WelcomeScreen.Hints.HelpHint>
              <></>
            </WelcomeScreen.Hints.HelpHint>
          </WelcomeScreen>
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas/>
            <MainMenu.DefaultItems.SaveAsImage/>
            <MainMenu.DefaultItems.ChangeCanvasBackground/>
          </MainMenu>
        </Excalidraw>}
      </div>
  )
}

export default Canvas