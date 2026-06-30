import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("deals").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    client: v.string(),
    value: v.number(),
    stage: v.union(v.literal("lead"), v.literal("proposal"), v.literal("negotiation"), v.literal("won"), v.literal("lost")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.string(),
    expectedClose: v.string(),
    description: v.string(),
    contactEmail: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deals", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("deals"),
    title: v.string(),
    client: v.string(),
    value: v.number(),
    stage: v.union(v.literal("lead"), v.literal("proposal"), v.literal("negotiation"), v.literal("won"), v.literal("lost")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.string(),
    expectedClose: v.string(),
    description: v.string(),
    contactEmail: v.string(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("deals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
