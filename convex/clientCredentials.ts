import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientCredentials")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clientCredentials").collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    platform: v.string(),
    username: v.string(),
    password: v.string(),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("needs_relogin"),
        v.literal("inactive"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clientCredentials", {
      ...args,
      status: args.status ?? "active",
      updatedAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clientCredentials"),
    platform: v.string(),
    username: v.string(),
    password: v.string(),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("needs_relogin"),
        v.literal("inactive"),
      ),
    ),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, {
      ...args,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("clientCredentials") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
