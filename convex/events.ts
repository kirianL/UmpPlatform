import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    time: v.string(),
    type: v.union(v.literal("shooting"), v.literal("pre-production"), v.literal("post-production"), v.literal("meeting"), v.literal("delivery")),
    description: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.string(),
    date: v.string(),
    time: v.string(),
    type: v.union(v.literal("shooting"), v.literal("pre-production"), v.literal("post-production"), v.literal("meeting"), v.literal("delivery")),
    description: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
