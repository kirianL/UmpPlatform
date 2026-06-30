import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("analyticsStats").collect();
  },
});

export const getTopContent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("topContent").collect();
  },
});

export const saveStats = mutation({
  args: {
    stats: v.array(
      v.object({
        platform: v.union(v.literal("all"), v.literal("youtube"), v.literal("instagram"), v.literal("tiktok"), v.literal("facebook")),
        followers: v.number(),
        followersGrowth: v.string(),
        views: v.number(),
        viewsGrowth: v.string(),
        engagement: v.string(),
        engagementGrowth: v.string(),
        shares: v.number(),
        sharesGrowth: v.string(),
        watchTime: v.string(),
        avgRetention: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete old stats first
    const existing = await ctx.db.query("analyticsStats").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    // Insert new stats
    for (const stat of args.stats) {
      await ctx.db.insert("analyticsStats", stat);
    }
  },
});

export const saveTopContent = mutation({
  args: {
    content: v.array(
      v.object({
        title: v.string(),
        platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok"), v.literal("facebook")),
        views: v.number(),
        likes: v.number(),
        watchTime: v.string(),
        retention: v.string(),
        duration: v.string(),
        date: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete old content first
    const existing = await ctx.db.query("topContent").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    // Insert new top content
    for (const item of args.content) {
      await ctx.db.insert("topContent", item);
    }
  },
});
