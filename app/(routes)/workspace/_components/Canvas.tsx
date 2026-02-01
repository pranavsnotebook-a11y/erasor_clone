import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { FILE } from '../../dashboard/_components/FileList';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { configureForStylus } from './usePointerOptimization';

function Canvas({onSaveTrigger,fileId,fileData}:{onSaveTrigger:any,fileId:any,fileData:FILE}) {

    const [whiteBoardData,setWhiteBoardData]=useState<any>();
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const isDrawingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Configure container for optimal stylus input
    useEffect(() => {
        if (containerRef.current) {
            configureForStylus(containerRef.current);
        }
    }, []);

    const updateWhiteboard=useMutation(api.files.updateWhiteboard)

    useEffect(()=>{
        onSaveTrigger&&saveWhiteboard();
    },[onSaveTrigger])

    const saveWhiteboard=()=>{
        // Get current elements from API if available
        const elements = excalidrawAPIRef.current?.getSceneElements() || whiteBoardData;
        if (elements) {
            updateWhiteboard({
                _id:fileId,
                whiteboard:JSON.stringify(elements)
            }).then(resp=>console.log(resp))
        }
    }

    // Throttled onChange handler - only updates when not actively drawing
    const handleChange = useCallback((excalidrawElements: any, appState: any, files: any) => {
        // Check if user is currently drawing (pen/touch down)
        const isCurrentlyDrawing = appState?.draggingElement !== null ||
                                   appState?.resizingElement !== null ||
                                   appState?.isResizing ||
                                   appState?.isRotating;

        isDrawingRef.current = isCurrentlyDrawing;

        // Only update React state when NOT actively drawing
        // This prevents React re-renders during stroke input
        if (!isCurrentlyDrawing) {
            setWhiteBoardData(excalidrawElements);
        }
    }, []);

    return (
    <div ref={containerRef} style={{ height: "670px", touchAction: 'none' }}>
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