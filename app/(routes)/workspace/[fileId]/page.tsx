"use client"
import React, { useEffect, useState } from 'react'
import WorkspaceHeader from '../_components/WorkspaceHeader'
import Editor from '../_components/Editor'
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FILE } from '../../dashboard/_components/FileList';
import Canvas from '../_components/Canvas';
import PerformanceMonitor from '../_components/PerformanceMonitor';

function Workspace({params}:any) {
   const [triggerSave,setTriggerSave]=useState(false);
   const convex=useConvex();
   const [fileData,setFileData]=useState<FILE|any>();
   useEffect(()=>{
    console.log("FILEID",params.fileId)
    params.fileId&&getFileData();
   },[])

   const getFileData=async()=>{
    const result=await convex.query(api.files.getFileById,{_id:params.fileId})
    setFileData(result);
  }
  return (
    <div>
      <PerformanceMonitor enabled={true} position="bottom-right" />
      <WorkspaceHeader onSave={()=>setTriggerSave(!triggerSave)} />

      {/* Workspace Layout - side by side like Eraser.io */}
      {/* Use 1/3 for editor, 2/3 for canvas to give Excalidraw enough width for horizontal toolbar */}
      <div className='grid grid-cols-1 lg:grid-cols-3'>
        {/* Document - 1/3 width */}
          <div className='h-screen'>
            <Editor onSaveTrigger={triggerSave}
            fileId={params.fileId}
            fileData={fileData}
            />
          </div>
        {/* Whiteboard/canvas - 2/3 width */}
        <div className='h-screen border-l lg:col-span-2'>
            <Canvas
             onSaveTrigger={triggerSave}
             fileId={params.fileId}
             fileData={fileData}
            />
        </div>
      </div>
    </div>
  )
}

export default Workspace