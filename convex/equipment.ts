import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("equipment").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    serialNumber: v.string(),
    category: v.string(),
    status: v.union(v.literal("available"), v.literal("in-use"), v.literal("maintenance")),
    location: v.string(),
    acquisitionDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("equipment", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("equipment"),
    name: v.string(),
    serialNumber: v.string(),
    category: v.string(),
    status: v.union(v.literal("available"), v.literal("in-use"), v.literal("maintenance")),
    location: v.string(),
    acquisitionDate: v.string(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
