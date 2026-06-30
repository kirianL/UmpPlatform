import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("employees").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    phone: v.string(),
    email: v.string(),
    salary: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    episodeCount: v.number(),
    avatarInitials: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("employees", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("employees"),
    name: v.string(),
    role: v.string(),
    phone: v.string(),
    email: v.string(),
    salary: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    episodeCount: v.number(),
    avatarInitials: v.string(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("employees") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
