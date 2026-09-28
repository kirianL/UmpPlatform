import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const sectionValidator = v.object({
  title: v.string(),
  paragraphs: v.array(v.string()),
});

const authorValidator = v.object({
  name: v.string(),
});

const articleFields = {
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  category: v.string(),
  publishedAt: v.string(),
  status: v.union(v.literal("borrador"), v.literal("publicado")),
  coverStorageId: v.optional(v.id("_storage")),
  intro: v.array(v.string()),
  sections: v.array(sectionValidator),
  authors: v.array(authorValidator),
  teamLabel: v.optional(v.string()),
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

function cleanSections(
  sections: { title: string; paragraphs: string[] }[],
) {
  return sections
    .map((section) => ({
      title: section.title.trim(),
      paragraphs: cleanParagraphs(section.paragraphs),
    }))
    .filter((section) => section.title || section.paragraphs.length > 0);
}

function cleanAuthors(authors: { name: string }[]) {
  return authors
    .map((author) => ({ name: author.name.trim() }))
    .filter((author) => author.name);
}

function wordCount(article: {
  excerpt: string;
  intro: string[];
  sections: { title: string; paragraphs: string[] }[];
}) {
  const text = [
    article.excerpt,
    ...article.intro,
    ...article.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
    ]),
  ].join(" ");
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function readMinutes(article: {
  excerpt: string;
  intro: string[];
  sections: { title: string; paragraphs: string[] }[];
}) {
  return Math.max(1, Math.round(wordCount(article) / 200) || 1);
}

async function withCoverUrl<T extends Doc<"newsArticles">>(
  ctx: QueryCtx,
  article: T,
) {
  const coverUrl = article.coverStorageId
    ? await ctx.storage.getUrl(article.coverStorageId)
    : null;
  return {
    ...article,
    coverUrl,
    readMinutes: readMinutes(article),
    topics: article.sections.map((section) => section.title).filter(Boolean),
  };
}

function toPublicCard(
  article: Awaited<ReturnType<typeof withCoverUrl>>,
) {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    publishedAt: article.publishedAt,
    coverUrl: article.coverUrl,
    readMinutes: article.readMinutes,
  };
}

function toPublicArticle(
  article: Awaited<ReturnType<typeof withCoverUrl>>,
) {
  return {
    ...toPublicCard(article),
    intro: article.intro,
    sections: article.sections,
    authors: article.authors,
    teamLabel: article.teamLabel || "Equipo Creativo UMP",
    topics: article.topics,
  };
}

async function assertUniqueSlug(
  ctx: { db: QueryCtx["db"] },
  slug: string,
  excludeId?: Id<"newsArticles">,
) {
  const existing = await ctx.db
    .query("newsArticles")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== excludeId) {
    throw new ConvexError("Ya existe una noticia con ese slug.");
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
    const docs = await ctx.db.query("newsArticles").order("desc").collect();
    const withUrls = await Promise.all(
      docs.map((doc) => withCoverUrl(ctx, doc)),
    );
    return withUrls.sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("newsArticles")
      .withIndex("by_status", (q) => q.eq("status", "publicado"))
      .collect();
    const withUrls = await Promise.all(
      docs.map((doc) => withCoverUrl(ctx, doc)),
    );
    return withUrls
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(toPublicCard);
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return null;
    const doc = await ctx.db
      .query("newsArticles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!doc || doc.status !== "publicado") return null;
    return toPublicArticle(await withCoverUrl(ctx, doc));
  },
});

export const create = mutation({
  args: articleFields,
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug || args.title);
    if (!slug) throw new ConvexError("El slug es obligatorio.");
    if (!args.title.trim()) throw new ConvexError("El título es obligatorio.");
    await assertUniqueSlug(ctx, slug);

    const now = new Date().toISOString();
    return await ctx.db.insert("newsArticles", {
      slug,
      title: args.title.trim(),
      excerpt: args.excerpt.trim(),
      category: args.category.trim() || "Institucional",
      publishedAt: args.publishedAt,
      status: args.status,
      coverStorageId: args.coverStorageId,
      intro: cleanParagraphs(args.intro),
      sections: cleanSections(args.sections),
      authors: cleanAuthors(args.authors),
      teamLabel: args.teamLabel?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("newsArticles"),
    ...articleFields,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("La noticia no existe.");

    const slug = normalizeSlug(args.slug || args.title);
    if (!slug) throw new ConvexError("El slug es obligatorio.");
    if (!args.title.trim()) throw new ConvexError("El título es obligatorio.");
    await assertUniqueSlug(ctx, slug, args.id);

    if (
      existing.coverStorageId &&
      existing.coverStorageId !== args.coverStorageId
    ) {
      await ctx.storage.delete(existing.coverStorageId);
    }

    await ctx.db.patch(args.id, {
      slug,
      title: args.title.trim(),
      excerpt: args.excerpt.trim(),
      category: args.category.trim() || "Institucional",
      publishedAt: args.publishedAt,
      status: args.status,
      coverStorageId: args.coverStorageId,
      intro: cleanParagraphs(args.intro),
      sections: cleanSections(args.sections),
      authors: cleanAuthors(args.authors),
      teamLabel: args.teamLabel?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("newsArticles"),
    status: v.union(v.literal("borrador"), v.literal("publicado")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("La noticia no existe.");
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("newsArticles") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (existing.coverStorageId) {
      await ctx.storage.delete(existing.coverStorageId);
    }
    await ctx.db.delete(args.id);
  },
});
