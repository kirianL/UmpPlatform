import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("actorSchedules").order("desc").collect();
  },
});

export const getByActorName = query({
  args: { actorName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("actorSchedules")
      .withIndex("by_actorName", (q) => q.eq("actorName", args.actorName))
      .collect();
  },
});

export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    if (!args.shareToken) return [];
    const token = args.shareToken.trim();

    // Return schedule for this token or all schedules if token is global
    const specific = await ctx.db
      .query("actorSchedules")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .collect();

    if (specific.length > 0) return specific;

    if (token === "general") {
      return await ctx.db.query("actorSchedules").collect();
    }

    const normalizedInput = token.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!normalizedInput) return [];

    const allActors = await ctx.db.query("actors").collect();
    const actor = allActors.find((a) => {
      if (a.shareToken === token) return true;
      const slug = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput;
    });

    if (actor) {
      const actorNameLower = actor.name.toLowerCase().trim();
      const allScheds = await ctx.db.query("actorSchedules").collect();
      return allScheds.filter(s => s.actorName.toLowerCase().trim() === actorNameLower);
    }

    // Fallback: match actorSchedules directly by actorName exact slug
    const allSchedules = await ctx.db.query("actorSchedules").collect();
    return allSchedules.filter((s) => {
      const slug = s.actorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput;
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    callTime: v.string(),
    location: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.string(),
    characterName: v.string(),
    sceneDetails: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("filmed"),
      v.literal("rescheduled"),
      v.literal("cancelled")
    ),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("actorSchedules", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("actorSchedules"),
    title: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    callTime: v.string(),
    location: v.string(),
    actorName: v.string(),
    characterName: v.string(),
    sceneDetails: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("filmed"),
      v.literal("rescheduled"),
      v.literal("cancelled")
    ),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("actorSchedules") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
