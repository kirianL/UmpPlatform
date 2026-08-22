import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialMediaPosts")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("socialMediaPosts").collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    title: v.string(),
    platform: v.union(
      v.literal("todas"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("tiktok"),
      v.literal("youtube"),
      v.literal("linkedin"),
      v.literal("otro"),
    ),
    contentType: v.union(
      v.literal("reel"),
      v.literal("carousel"),
      v.literal("image"),
      v.literal("story"),
      v.literal("video"),
      v.literal("post"),
    ),
    scheduledDate: v.string(),
    scheduledTime: v.optional(v.string()),
    status: v.union(
      v.literal("planificado"),
      v.literal("en_proceso"),
      v.literal("publicado"),
      v.literal("cancelado"),
    ),
    postUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    notes: v.optional(v.string()),
    views: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("socialMediaPosts", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("socialMediaPosts"),
    title: v.string(),
    platform: v.union(
      v.literal("todas"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("tiktok"),
      v.literal("youtube"),
      v.literal("linkedin"),
      v.literal("otro"),
    ),
    contentType: v.union(
      v.literal("reel"),
      v.literal("carousel"),
      v.literal("image"),
      v.literal("story"),
      v.literal("video"),
      v.literal("post"),
    ),
    scheduledDate: v.string(),
    scheduledTime: v.optional(v.string()),
    status: v.union(
      v.literal("planificado"),
      v.literal("en_proceso"),
      v.literal("publicado"),
      v.literal("cancelado"),
    ),
    postUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    notes: v.optional(v.string()),
    views: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("socialMediaPosts"),
    status: v.union(
      v.literal("planificado"),
      v.literal("en_proceso"),
      v.literal("publicado"),
      v.literal("cancelado"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
  },
});

export const remove = mutation({
  args: { id: v.id("socialMediaPosts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
