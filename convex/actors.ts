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

    const allActors = await ctx.db.query("actors").collect();

    // 1. Exact match by shareToken or _id
    let actor = allActors.find(
      (a) => a.shareToken === token || a._id === token,
    );
    if (actor) return actor;

    const normalizedInput = toSlug(token);
    if (!normalizedInput) return null;

    // 2. Exact match by name slug in actors table
    actor = allActors.find((a) => toSlug(a.name) === normalizedInput);
    if (actor) return actor;

    // 3. Match via actorSchedules table by shareToken or actorName slug
    const allSchedules = await ctx.db.query("actorSchedules").collect();
    const matchingSchedules = allSchedules.filter((s) => {
      if (s.shareToken === token) return true;
      const sSlug = toSlug(s.actorName);
      return sSlug === normalizedInput;
    });

    if (matchingSchedules.length > 0) {
      // Check if any schedule is linked to an existing actor by actorId
      for (const s of matchingSchedules) {
        if (s.actorId) {
          const linkedActor = allActors.find((a) => a._id === s.actorId);
          if (linkedActor) return linkedActor;
        }
      }

      // Check if schedule actorName matches an actor in allActors by slug
      const rawName = matchingSchedules[0].actorName;
      const { name, characterName } = extractNameAndCharacter(
        rawName,
        matchingSchedules[0].characterName,
      );

      const matchedByName = allActors.find(
        (a) => toSlug(a.name) === toSlug(name),
      );
      if (matchedByName) return matchedByName;

      // Synthetic fallback if actor record does not exist in actors table
      return {
        _id: ("synthetic-" + token) as any,
        _creationTime: Date.now(),
        name,
        characterName,
        characterBio:
          "Elenco de producción registrado para llamados de rodaje.",
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
    birthDate: v.optional(v.string()),
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
    birthDate: v.optional(v.string()),
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
