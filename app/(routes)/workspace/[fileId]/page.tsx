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

      {/* Workspace Layout - use 2xl breakpoint (1536px+) for split view so canvas gets enough width */}
      <div className='grid grid-cols-1 2xl:grid-cols-2'>
        {/* Document  */}
          <div className='h-[45vh] 2xl:h-screen overflow-auto border-b 2xl:border-b-0'>
            <Editor onSaveTrigger={triggerSave}
            fileId={params.fileId}
            fileData={fileData}
            />
          </div>
        {/* Whiteboard/canvas  */}
        <div className='h-[55vh] 2xl:h-screen 2xl:border-l'>
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