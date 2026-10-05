import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const creditValidator = v.object({
  role: v.string(),
  name: v.string(),
});

const galleryItemValidator = v.object({
  storageId: v.id("_storage"),
  alt: v.optional(v.string()),
});

const projectFields = {
  slug: v.string(),
  title: v.string(),
  subtitle: v.string(),
  excerpt: v.string(),
  category: v.string(),
  year: v.string(),
  client: v.string(),
  deliverables: v.string(),
  status: v.union(v.literal("borrador"), v.literal("publicado")),
  coverStorageId: v.optional(v.id("_storage")),
  videoYoutubeId: v.optional(v.string()),
  lead: v.string(),
  story: v.array(v.string()),
  credits: v.array(creditValidator),
  gallery: v.array(galleryItemValidator),
};

function normalizeSlug(slug: string) {
  return slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanParagraphs(paragraphs: string[]) {
  return paragraphs.map((item) => item.trim()).filter(Boolean);
}

function cleanCredits(credits: { role: string; name: string }[]) {
  return credits
    .map((credit) => ({
      role: credit.role.trim(),
      name: credit.name.trim(),
    }))
    .filter((credit) => credit.role || credit.name);
}

function cleanGallery(
  gallery: { storageId: Id<"_storage">; alt?: string }[],
) {
  const seen = new Set<string>();
  return gallery.filter((item) => {
    if (seen.has(item.storageId)) return false;
    seen.add(item.storageId);
    return true;
  });
}

function parseYoutubeId(value?: string) {
  const trimmed = value?.trim() || "";
  if (!trimmed) return undefined;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function galleryIds(gallery: { storageId: Id<"_storage"> }[]) {
  return gallery.map((item) => item.storageId);
}

async function deleteUnusedImages(
  ctx: { storage: { delete: (id: Id<"_storage">) => Promise<void> } },
  previous: Id<"_storage">[],
  next: Id<"_storage">[],
) {
  const keep = new Set(next);
  for (const id of previous) {
    if (!keep.has(id)) {
      await ctx.storage.delete(id);
    }
  }
}

type GalleryWithUrl = {
  storageId: Id<"_storage">;
  alt?: string;
  url: string | null;
};

async function withMedia(ctx: QueryCtx, project: Doc<"portfolioProjects">) {
  const coverUrl = project.coverStorageId
    ? await ctx.storage.getUrl(project.coverStorageId)
    : null;
  const gallery: GalleryWithUrl[] = await Promise.all(
    project.gallery.map(async (item) => ({
      ...item,
      url: await ctx.storage.getUrl(item.storageId),
    })),
  );
  return {
    ...project,
    coverUrl,
    gallery,
  };
}

function toPublicCard(project: Awaited<ReturnType<typeof withMedia>>) {
  return {
    slug: project.slug,
    title: project.title,
    subtitle: project.subtitle,
    excerpt: project.excerpt,
    category: project.category,
    year: project.year,
    coverUrl: project.coverUrl,
  };
}

function toPublicProject(project: Awaited<ReturnType<typeof withMedia>>) {
  return {
    ...toPublicCard(project),
    client: project.client,
    deliverables: project.deliverables,
    videoYoutubeId: project.videoYoutubeId,
    lead: project.lead,
    story: project.story,
    credits: project.credits,
    gallery: project.gallery
      .filter((item) => item.url)
      .map((item) => ({
        src: item.url as string,
        alt: item.alt || project.title,
      })),
  };
}

async function assertUniqueSlug(
  ctx: { db: QueryCtx["db"] },
  slug: string,
  excludeId?: Id<"portfolioProjects">,
) {
  const existing = await ctx.db
    .query("portfolioProjects")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== excludeId) {
    throw new ConvexError("Ya existe un proyecto con ese slug.");
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("portfolioProjects").order("desc").collect();
    const withUrls = await Promise.all(docs.map((doc) => withMedia(ctx, doc)));
    return withUrls.sort((a, b) => {
      const year = b.year.localeCompare(a.year);
      if (year !== 0) return year;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("portfolioProjects")
      .withIndex("by_status", (q) => q.eq("status", "publicado"))
      .collect();
    const withUrls = await Promise.all(docs.map((doc) => withMedia(ctx, doc)));
    return withUrls
      .sort((a, b) => {
        const year = b.year.localeCompare(a.year);
        if (year !== 0) return year;
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .map(toPublicCard);
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return null;
    const doc = await ctx.db
      .query("portfolioProjects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!doc || doc.status !== "publicado") return null;
    return toPublicProject(await withMedia(ctx, doc));
  },
});

export const create = mutation({
  args: projectFields,
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug || args.title);
    if (!slug) throw new ConvexError("El slug es obligatorio.");
    if (!args.title.trim()) throw new ConvexError("El título es obligatorio.");
    await assertUniqueSlug(ctx, slug);

    const now = new Date().toISOString();
    return await ctx.db.insert("portfolioProjects", {
      slug,
      title: args.title.trim(),
      subtitle: args.subtitle.trim(),
      excerpt: args.excerpt.trim(),
      category: args.category.trim() || "Producción",
      year: args.year.trim() || String(new Date().getFullYear()),
      client: args.client.trim(),
      deliverables: args.deliverables.trim(),
      status: args.status,
      coverStorageId: args.coverStorageId,
      videoYoutubeId: parseYoutubeId(args.videoYoutubeId),
      lead: args.lead.trim(),
      story: cleanParagraphs(args.story),
      credits: cleanCredits(args.credits),
      gallery: cleanGallery(args.gallery),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("portfolioProjects"),
    ...projectFields,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("El proyecto no existe.");

    const slug = normalizeSlug(args.slug || args.title);
    if (!slug) throw new ConvexError("El slug es obligatorio.");
    if (!args.title.trim()) throw new ConvexError("El título es obligatorio.");
    await assertUniqueSlug(ctx, slug, args.id);

    const gallery = cleanGallery(args.gallery);
    const previousImages = [
      ...(existing.coverStorageId ? [existing.coverStorageId] : []),
      ...galleryIds(existing.gallery),
    ];
    const nextImages = [
      ...(args.coverStorageId ? [args.coverStorageId] : []),
      ...galleryIds(gallery),
    ];
    await deleteUnusedImages(ctx, previousImages, nextImages);

    await ctx.db.patch(args.id, {
      slug,
      title: args.title.trim(),
      subtitle: args.subtitle.trim(),
      excerpt: args.excerpt.trim(),
      category: args.category.trim() || "Producción",
      year: args.year.trim() || String(new Date().getFullYear()),
      client: args.client.trim(),
      deliverables: args.deliverables.trim(),
      status: args.status,
      coverStorageId: args.coverStorageId,
      videoYoutubeId: parseYoutubeId(args.videoYoutubeId),
      lead: args.lead.trim(),
      story: cleanParagraphs(args.story),
      credits: cleanCredits(args.credits),
      gallery,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("portfolioProjects"),
    status: v.union(v.literal("borrador"), v.literal("publicado")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("El proyecto no existe.");
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("portfolioProjects") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (existing.coverStorageId) {
      await ctx.storage.delete(existing.coverStorageId);
    }
    for (const id of galleryIds(existing.gallery)) {
      await ctx.storage.delete(id);
    }
    await ctx.db.delete(args.id);
  },
});
