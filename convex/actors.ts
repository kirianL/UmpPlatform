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
    if (!args.shareToken) return null;
    const token = args.shareToken.trim();

    // 1. Exact match by shareToken index
    const exact = await ctx.db
      .query("actors")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .first();
    if (exact) return exact;

    const normalizedInput = token.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!normalizedInput) return null;

    const allActors = await ctx.db.query("actors").collect();

    // 2. Exact match by name slug
    const exactSlug = allActors.find((a) => {
      const slug = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput;
    });
    if (exactSlug) return exactSlug;

    // 3. Match via actorSchedules table by shareToken
    const schedules = await ctx.db
      .query("actorSchedules")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .collect();

    if (schedules.length > 0) {
      const actorNameInSched = schedules[0].actorName;
      const matchedByName = allActors.find((a) => 
        a.name.toLowerCase().trim() === actorNameInSched.toLowerCase().trim()
      );
      if (matchedByName) return matchedByName;

      return {
        _id: "synthetic-" + token as any,
        _creationTime: Date.now(),
        name: actorNameInSched,
        characterName: schedules[0].characterName || "Personaje",
        characterBio: "",
        photoUrl: "",
        phone: "",
        email: "",
        status: "active" as const,
        episodeCount: schedules.length,
        shareToken: token,
      };
    }

    // 4. Fallback: Check if token matches actorName slug in actorSchedules
    const allSchedules = await ctx.db.query("actorSchedules").collect();
    const schedMatch = allSchedules.find((s) => {
      const slug = s.actorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug === normalizedInput;
    });
    if (schedMatch) {
      const matchedByName = allActors.find((a) => 
        a.name.toLowerCase().trim() === schedMatch.actorName.toLowerCase().trim()
      );
      if (matchedByName) return matchedByName;

      return {
        _id: "synthetic-" + token as any,
        _creationTime: Date.now(),
        name: schedMatch.actorName,
        characterName: schedMatch.characterName || "Personaje",
        characterBio: "",
        photoUrl: "",
        phone: "",
        email: "",
        status: "active" as const,
        episodeCount: 1,
        shareToken: token,
      };
    }

    return null;
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
