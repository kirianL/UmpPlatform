import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("actors").order("desc").collect();
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

function extractNameAndCharacter(rawName: string, rawCharacter?: string) {
  let name = rawName.trim();
  let character = rawCharacter?.trim() || "";

  const match = name.match(/^(.*?)\((.*?)\)$/);
  if (match) {
    name = match[1].trim();
    if (!character) {
      character = match[2].trim();
    }
  }

  return {
    name: name || rawName,
    characterName: character || "Personaje Principal",
  };
}

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

    const normalizedInput = toSlug(token);
    if (!normalizedInput) return null;

    const allActors = await ctx.db.query("actors").collect();

    // 2. Match by name slug in actors table
    const exactSlug = allActors.find((a) => {
      const slug = toSlug(a.name);
      return slug === normalizedInput || slug.includes(normalizedInput) || normalizedInput.includes(slug);
    });
    if (exactSlug) return exactSlug;

    // 3. Match via actorSchedules table by shareToken
    const schedules = await ctx.db
      .query("actorSchedules")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .collect();

    if (schedules.length > 0) {
      const rawName = schedules[0].actorName;
      const { name, characterName } = extractNameAndCharacter(rawName, schedules[0].characterName);
      const matchedByName = allActors.find((a) => 
        toSlug(a.name) === toSlug(name)
      );
      if (matchedByName) return matchedByName;

      return {
        _id: "synthetic-" + token as any,
        _creationTime: Date.now(),
        name,
        characterName,
        characterBio: "Elenco de producción registrado para llamados de rodaje.",
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
    const matchingSchedules = allSchedules.filter((s) => {
      const slug = toSlug(s.actorName);
      return slug === normalizedInput || (slug.length > 3 && (slug.includes(normalizedInput) || normalizedInput.includes(slug)));
    });

    if (matchingSchedules.length > 0) {
      const rawName = matchingSchedules[0].actorName;
      const { name, characterName } = extractNameAndCharacter(rawName, matchingSchedules[0].characterName);

      const matchedByName = allActors.find((a) => 
        toSlug(a.name) === toSlug(name)
      );
      if (matchedByName) return matchedByName;

      return {
        _id: "synthetic-" + token as any,
        _creationTime: Date.now(),
        name,
        characterName,
        characterBio: "Elenco de producción registrado para llamados de rodaje.",
        photoUrl: "",
        phone: "",
        email: "",
        status: "active" as const,
        episodeCount: matchingSchedules.length,
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
    const token = args.shareToken || toSlug(args.name) || "actor-" + Date.now();
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
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const shareToken = args.shareToken || toSlug(args.name);
    await ctx.db.patch(id, { ...args, shareToken });
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
