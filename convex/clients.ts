import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clients").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    company: v.string(),
    phone: v.string(),
    email: v.string(),
    lastInteraction: v.string(),
    projectCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clients", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.string(),
    company: v.string(),
    phone: v.string(),
    email: v.string(),
    lastInteraction: v.string(),
    projectCount: v.number(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
