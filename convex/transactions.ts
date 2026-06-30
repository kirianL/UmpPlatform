import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transactions").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    concept: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    concept: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("cancelled")),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
