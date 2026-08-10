import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialMediaGoals")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

export const setGoal = mutation({
  args: {
    clientId: v.id("clients"),
    month: v.string(), // YYYY-MM
    targetPosts: v.number(),
    targetReels: v.optional(v.number()),
    targetStories: v.optional(v.number()),
    targetCarousels: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("socialMediaGoals")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("month"), args.month))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        targetPosts: args.targetPosts,
        targetReels: args.targetReels,
        targetStories: args.targetStories,
        targetCarousels: args.targetCarousels,
        notes: args.notes,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("socialMediaGoals", args);
    }
  },
});
