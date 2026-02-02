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
            // Merge elements by ID - newer version wins
            const elementMap = new Map();
            for (const el of existingData.elements) {
                elementMap.set(el.id, el);
            }
            for (const el of newData.elements) {
                const existing = elementMap.get(el.id);
                // Keep element with higher version, or new element if no existing
                if (!existing || (el.version || 0) >= (existing.version || 0)) {
                    elementMap.set(el.id, el);
                }
            }

            // Merge files - union of all files (images)
            const mergedFiles = { ...existingData.files, ...newData.files };

            const mergedData = {
                elements: Array.from(elementMap.values()),
                files: mergedFiles
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