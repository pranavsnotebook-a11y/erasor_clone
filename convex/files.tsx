import {v} from 'convex/values';
import { mutation, query } from './_generated/server';

export const createFile=mutation({
    args:{
        fileName:v.string(),
        teamId:v.string(),
        createdBy:v.string(),
        archive:v.boolean(),
        document:v.string(),
        whiteboard:v.string()
    },
    handler:async(ctx, args) =>{
        const result=await ctx.db.insert('files',args);
        return result;
    },
})

export const getFiles=query({
    args:{
        teamId:v.string()
    },
    handler:async(ctx, args)=> {
        const result=ctx.db.query('files')
        .filter(q=>q.eq(q.field('teamId'),args.teamId))
        .order('desc')
        .collect();

        return result;
    },
})

export const updateDocument=mutation({
    args:{
        _id:v.id('files'),
        document:v.string()
    },
    handler:async(ctx, args) =>{
        const result =await ctx.db.patch(args._id,{document:args.document});
        return result;
    },
})

export const updateWhiteboard=mutation({
    args:{
        _id:v.id('files'),
        whiteboard:v.string()
    },
    handler:async(ctx, args) =>{
        // Get existing data to merge (prevents multi-tab overwrites)
        const existing = await ctx.db.get(args._id);
        const existingData = existing?.whiteboard ? JSON.parse(existing.whiteboard) : null;
        const newData = JSON.parse(args.whiteboard);

        // If both have the new format { elements, files }, merge them
        if (existingData?.elements && newData?.elements) {
            // Merge elements by ID using version + updated timestamp
            const elementMap = new Map();

            // First, add all existing elements
            for (const el of existingData.elements) {
                elementMap.set(el.id, el);
            }

            // Then merge new elements with conflict resolution
            for (const el of newData.elements) {
                const existing = elementMap.get(el.id);
                if (!existing) {
                    // New element - add it
                    elementMap.set(el.id, el);
                } else {
                    // Conflict resolution:
                    // 1. Higher version wins
                    // 2. If same version, newer timestamp wins
                    // 3. Deleted state is "sticky" - once deleted, stays deleted unless newer version restores
                    const newVersion = el.version || 0;
                    const existingVersion = existing.version || 0;
                    const newUpdated = el.updated || 0;
                    const existingUpdated = existing.updated || 0;

                    if (newVersion > existingVersion) {
                        elementMap.set(el.id, el);
                    } else if (newVersion === existingVersion) {
                        // Same version - use timestamp, but preserve deletion
                        if (existing.isDeleted && !el.isDeleted) {
                            // Keep deleted state (deletion is sticky)
                            elementMap.set(el.id, existing);
                        } else if (newUpdated > existingUpdated) {
                            elementMap.set(el.id, el);
                        }
                        // else keep existing
                    }
                    // else newVersion < existingVersion, keep existing
                }
            }

            // Merge files - union of all files (images)
            const mergedFiles = { ...existingData.files, ...newData.files };

            // Clean up orphaned files (optional - keeps files referenced by any element)
            const usedFileIds = new Set();
            for (const el of elementMap.values()) {
                if (el.type === 'image' && el.fileId) {
                    usedFileIds.add(el.fileId);
                }
            }
            const cleanedFiles: Record<string, any> = {};
            for (const [fileId, fileData] of Object.entries(mergedFiles)) {
                if (usedFileIds.has(fileId)) {
                    cleanedFiles[fileId] = fileData;
                }
            }

            const mergedData = {
                elements: Array.from(elementMap.values()),
                files: cleanedFiles
            };

            const result = await ctx.db.patch(args._id, { whiteboard: JSON.stringify(mergedData) });
            return result;
        }

        // Fallback: just save new data (old format or first save)
        const result = await ctx.db.patch(args._id, { whiteboard: args.whiteboard });
        return result;
    },
})



export const getFileById=query({
    args:{
        _id:v.id('files')
    },
    handler:async(ctx, args)=> {
        const result=await ctx.db.get(args._id);
        return result;
    },
})