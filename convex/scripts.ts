import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scripts").order("desc").collect();
  },
});

export const getByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    if (!args.shareId) return null;
    const script = await ctx.db
      .query("scripts")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .first();
    if (script) return script;

    const fallback = await ctx.db
      .query("scripts")
      .filter((q) => q.eq(q.field("shareId"), args.shareId))
      .first();
    return fallback ?? null;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    episodeOrProject: v.string(),
    version: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("approved")
    ),
    fileUrl: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.string(),
    fileType: v.string(),
    uploadedAt: v.string(),
    uploadedBy: v.string(),
    shareId: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scripts", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("scripts"),
    title: v.string(),
    episodeOrProject: v.string(),
    version: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("approved")
    ),
    fileUrl: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.string(),
    fileType: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("scripts") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      // Clean up comments for this script as well
      const comments = await ctx.db
        .query("scriptComments")
        .withIndex("by_scriptId", (q) => q.eq("scriptId", existing._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(args.id);
    }
  },
});

// ---------------------------------------------------------------------------
// Script Comments API
// ---------------------------------------------------------------------------

export const getCommentsByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scriptComments")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .order("desc")
      .collect();
  },
});

export const getCommentsByScriptId = query({
  args: { scriptId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scriptComments")
      .withIndex("by_scriptId", (q) => q.eq("scriptId", args.scriptId))
      .order("desc")
      .collect();
  },
});

export const addComment = mutation({
  args: {
    scriptId: v.string(),
    shareId: v.string(),
    authorName: v.string(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const createdAt = new Date().toISOString();
    return await ctx.db.insert("scriptComments", {
      ...args,
      createdAt,
    });
  },
});

export const migrateFilmingToApproved = mutation({
  args: {},
  handler: async (ctx) => {
    const scripts = await ctx.db.query("scripts").collect();
    for (const script of scripts) {
      if ((script.status as string) === "filming") {
        await ctx.db.patch(script._id, { status: "approved" });
      }
    }
  },
});
