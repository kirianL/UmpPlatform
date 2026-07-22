import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("actors").order("desc").collect();
  },
});

export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const exact = await ctx.db
      .query("actors")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
    if (exact) return exact;

    const normalizedInput = args.shareToken.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const allActors = await ctx.db.query("actors").collect();
    const matched = allActors.find((a) => {
      const slug = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput || normalizedInput.startsWith(slug);
    });
    return matched || null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    characterName: v.string(),
    characterBio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    episodeCount: v.number(),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = args.shareToken || args.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20) + "-" + Math.random().toString(36).substring(2, 7);
    return await ctx.db.insert("actors", { ...args, shareToken: token });
  },
});

export const update = mutation({
  args: {
    id: v.id("actors"),
    name: v.string(),
    characterName: v.string(),
    characterBio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    episodeCount: v.number(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("actors") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
