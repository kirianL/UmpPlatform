import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("potentialCollaborators").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    area: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("por_contactar"),
        v.literal("en_conversacion"),
        v.literal("confirmado"),
        v.literal("descartado"),
      ),
    ),
    photoUrl: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = args.createdAt || new Date().toISOString().slice(0, 10);
    const status = args.status || "por_contactar";
    return await ctx.db.insert("potentialCollaborators", {
      ...args,
      status,
      createdAt,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("potentialCollaborators"),
    name: v.string(),
    area: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("por_contactar"),
        v.literal("en_conversacion"),
        v.literal("confirmado"),
        v.literal("descartado"),
      ),
    ),
    photoUrl: v.optional(v.string()),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("potentialCollaborators") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
