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
    // Return schedule for this token or all schedules if token is global
    const specific = await ctx.db
      .query("actorSchedules")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .collect();

    if (specific.length > 0) return specific;

    if (args.shareToken === "general") {
      return await ctx.db.query("actorSchedules").collect();
    }

    const normalizedInput = args.shareToken.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const allActors = await ctx.db.query("actors").collect();
    const actor = allActors.find((a) => {
      if (a.shareToken === args.shareToken) return true;
      const slug = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput || normalizedInput.startsWith(slug);
    });

    if (actor) {
      return await ctx.db
        .query("actorSchedules")
        .withIndex("by_actorName", (q) => q.eq("actorName", actor.name))
        .collect();
    }

    // Fallback: match actorSchedules directly by actorName slug
    const allSchedules = await ctx.db.query("actorSchedules").collect();
    const matchedSchedules = allSchedules.filter((s) => {
      const slug = s.actorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput || normalizedInput.startsWith(slug);
    });

    return matchedSchedules;
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
