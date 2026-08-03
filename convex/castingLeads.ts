import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("castingLeads").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("nuevo"), v.literal("contactado"), v.literal("evaluado"), v.literal("descartado"))),
    createdAt: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = args.createdAt || new Date().toISOString().slice(0, 10);
    const status = args.status || "nuevo";
    return await ctx.db.insert("castingLeads", {
      ...args,
      status,
      createdAt,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("castingLeads"),
    name: v.string(),
    phone: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("nuevo"), v.literal("contactado"), v.literal("evaluado"), v.literal("descartado"))),
    birthDate: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("castingLeads") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
