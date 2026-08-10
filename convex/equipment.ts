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
    serialNumber: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("in-use"),
        v.literal("maintenance"),
      ),
    ),
    location: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("equipment", {
      ...args,
      category: args.category || "accessory",
      status: args.status || "available",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("equipment"),
    name: v.string(),
    serialNumber: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("in-use"),
        v.literal("maintenance"),
      ),
    ),
    location: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
