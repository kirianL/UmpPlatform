import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { resolveNewsAuthor } from "./newsAuthors";

const sectionValidator = v.object({
  title: v.string(),
  paragraphs: v.array(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
});

const authorValidator = v.object({
  id: v.optional(v.string()),
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
  sections: {
    title: string;
    paragraphs: string[];
    imageStorageId?: Id<"_storage">;
  }[],
) {
  return sections
    .map((section) => ({
      title: section.title.trim(),
      paragraphs: cleanParagraphs(section.paragraphs),
      imageStorageId: section.imageStorageId,
    }))
    .filter(
      (section) =>
        section.title ||
        section.paragraphs.length > 0 ||
        section.imageStorageId,
    );
}

function sectionImageIds(
  sections: { imageStorageId?: Id<"_storage"> }[],
) {
  return sections
    .map((section) => section.imageStorageId)
    .filter((id): id is Id<"_storage"> => Boolean(id));
}

async function deleteUnusedImages(
  ctx: { storage: { delete: (id: Id<"_storage">) => Promise<void> } },
  previous: { imageStorageId?: Id<"_storage"> }[],
  next: { imageStorageId?: Id<"_storage"> }[],
) {
  const keep = new Set(sectionImageIds(next));
  for (const id of sectionImageIds(previous)) {
    if (!keep.has(id)) {
      await ctx.storage.delete(id);
    }
  }
}

function cleanAuthors(authors: { id?: string; name: string }[]) {
  const seen = new Set<string>();
  const cleaned: { id?: string; name: string }[] = [];
  for (const author of authors) {
    const known = resolveNewsAuthor(author);
    const next = known
      ? { id: String(known.id), name: String(known.name) }
      : author.name.trim()
        ? { name: author.name.trim() }
        : null;
    if (!next) continue;
    const key = next.id || next.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(next);
  }
  return cleaned;
}

function toPublicAuthors(authors: { id?: string; name: string }[]) {
  return cleanAuthors(authors).map((author) => {
    const known = resolveNewsAuthor(author);
    return {
      id: known?.id,
      name: known?.name ?? author.name,
      photo: known?.photo,
    };
  });
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

type NewsSectionWithUrl = Doc<"newsArticles">["sections"][number] & {
  imageUrl: string | null;
};

async function withCoverUrl(ctx: QueryCtx, article: Doc<"newsArticles">) {
  const coverUrl = article.coverStorageId
    ? await ctx.storage.getUrl(article.coverStorageId)
    : null;
  const sections: NewsSectionWithUrl[] = await Promise.all(
    article.sections.map(async (section) => ({
      ...section,
      imageUrl: section.imageStorageId
        ? await ctx.storage.getUrl(section.imageStorageId)
        : null,
    })),
  );
  const { sections: _storedSections, ...rest } = article;
  return {
    ...rest,
    coverUrl,
    sections,
    readMinutes: readMinutes(article),
    topics: sections.map((section) => section.title).filter(Boolean),
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
    sections: article.sections.map((section) => ({
      title: section.title,
      paragraphs: section.paragraphs,
      imageUrl: section.imageUrl,
    })),
    authors: toPublicAuthors(article.authors),
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

    const sections = cleanSections(args.sections);
    await deleteUnusedImages(ctx, existing.sections, sections);

    await ctx.db.patch(args.id, {
      slug,
      title: args.title.trim(),
      excerpt: args.excerpt.trim(),
      category: args.category.trim() || "Institucional",
      publishedAt: args.publishedAt,
      status: args.status,
      coverStorageId: args.coverStorageId,
      intro: cleanParagraphs(args.intro),
      sections,
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
    for (const id of sectionImageIds(existing.sections)) {
      await ctx.storage.delete(id);
    }
    await ctx.db.delete(args.id);
  },
});
