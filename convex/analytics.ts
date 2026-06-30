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
        monthlyViews: v.optional(v.array(v.object({
          month: v.string(),
          views: v.number(),
        }))),
        demographics: v.optional(v.object({
          age: v.array(v.object({ label: v.string(), value: v.number() })),
          location: v.array(v.object({ label: v.string(), value: v.number() })),
          gender: v.array(v.object({ label: v.string(), value: v.number(), color: v.string() })),
        })),
        retentionCurve: v.optional(v.array(v.object({
          ratio: v.number(),
          retention: v.number(),
        }))),
        insights: v.optional(v.array(v.object({
          title: v.string(),
          description: v.string(),
          type: v.union(v.literal("warning"), v.literal("tip"), v.literal("info")),
        }))),
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
        id: v.optional(v.string()),
        title: v.string(),
        platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok"), v.literal("facebook")),
        views: v.number(),
        likes: v.number(),
        watchTime: v.string(),
        retention: v.string(),
        duration: v.string(),
        date: v.string(),
        thumbnailUrl: v.optional(v.string()),
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
