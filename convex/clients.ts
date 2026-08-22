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
    company: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.union(v.literal("activo"), v.literal("potencial"))),
    lastInteraction: v.optional(v.string()),
    projectCount: v.optional(v.number()),
    notes: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clients", {
      ...args,
      company: args.company ?? "",
      phone: args.phone ?? "",
      email: args.email ?? "",
      lastInteraction:
        args.lastInteraction ?? new Date().toISOString().slice(0, 10),
      projectCount: args.projectCount ?? 0,
      type: args.type ?? "activo",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.string(),
    company: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.union(v.literal("activo"), v.literal("potencial"))),
    lastInteraction: v.optional(v.string()),
    projectCount: v.optional(v.number()),
    notes: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const updateType = mutation({
  args: {
    id: v.id("clients"),
    type: v.union(v.literal("activo"), v.literal("potencial")),
  },
  handler: async (ctx, { id, type }) => {
    await ctx.db.patch(id, { type });
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
