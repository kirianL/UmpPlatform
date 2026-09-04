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

function toSlug(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    if (!args.shareToken) return [];
    const token = args.shareToken.trim();

    if (token === "general" || token === "all") {
      const all = await ctx.db.query("actorSchedules").collect();
      return all.sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return (a.callTime || a.startTime || "").localeCompare(
          b.callTime || b.startTime || "",
        );
      });
    }

    const normalizedInput = toSlug(token);
    const allActors = await ctx.db.query("actors").collect();

    // Strict actor matching
    const matchedActor = allActors.find((a) => {
      if (a.shareToken === token || a._id === token) return true;
      if (!normalizedInput) return false;
      return toSlug(a.name) === normalizedInput;
    });

    const actorSlug = matchedActor
      ? toSlug(matchedActor.name)
      : normalizedInput;
    const actorToken = matchedActor?.shareToken;
    const actorId = matchedActor?._id;

    const allSchedules = await ctx.db.query("actorSchedules").collect();
    const matching = allSchedules.filter((s) => {
      if (s.shareToken === token) return true;
      if (actorToken && s.shareToken === actorToken) return true;
      if (actorId && s.actorId === actorId) return true;

      const sSlug = toSlug(s.actorName);
      if (!sSlug) return false;
      if (normalizedInput && sSlug === normalizedInput) return true;
      if (actorSlug && sSlug === actorSlug) return true;

      return false;
    });

    // Deduplicate by ID
    const uniqueMap = new Map<string, (typeof matching)[0]>();
    for (const item of matching) {
      uniqueMap.set(item._id, item);
    }

    return Array.from(uniqueMap.values()).sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.callTime || a.startTime || "").localeCompare(
        b.callTime || b.startTime || "",
      );
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
      v.literal("cancelled"),
    ),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const shareToken = args.shareToken || toSlug(args.actorName) || "general";
    return await ctx.db.insert("actorSchedules", { ...args, shareToken });
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
    actorId: v.optional(v.string()),
    actorName: v.string(),
    characterName: v.string(),
    sceneDetails: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("filmed"),
      v.literal("rescheduled"),
      v.literal("cancelled"),
    ),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const shareToken = args.shareToken || toSlug(args.actorName) || "general";
    await ctx.db.patch(id, { ...args, shareToken });
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
