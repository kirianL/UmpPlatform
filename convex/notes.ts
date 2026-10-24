import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";

const checklistValidator = v.optional(
  v.array(
    v.object({
      id: v.string(),
      text: v.string(),
      done: v.boolean(),
    }),
  ),
);

const blockTypeValidator = v.union(
  v.literal("text"),
  v.literal("heading"),
  v.literal("checklist"),
  v.literal("image"),
  v.literal("link"),
  v.literal("table"),
);

const tableDataValidator = v.optional(
  v.object({
    columns: v.array(v.string()),
    rows: v.array(v.array(v.string())),
  }),
);

const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("all"),
  v.literal("selected"),
);

const authArgs = {
  actorEmail: v.string(),
  isAdmin: v.boolean(),
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sortNotes(notes: Doc<"notes">[]) {
  return notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const dateA = a.updatedAt || a.createdAt;
    const dateB = b.updatedAt || b.createdAt;
    return dateB.localeCompare(dateA);
  });
}

function hasReadAccess(note: Doc<"notes">, email: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (note.ownerEmail === normalized) return true;
  if (note.visibility === "all") return true;
  if (
    note.sharedWith &&
    note.sharedWith.map(normalizeEmail).includes(normalized)
  ) {
    return true;
  }
  return false;
}

function canMutate(note: Doc<"notes">, actorEmail: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const normalized = normalizeEmail(actorEmail);
  if (note.ownerEmail === normalized) return true;
  if (note.visibility === "all") return true;
  if (
    note.sharedWith &&
    note.sharedWith.map(normalizeEmail).includes(normalized)
  ) {
    return true;
  }
  return false;
}

async function requireNote(
  ctx: MutationCtx,
  id: Id<"notes">,
  actorEmail: string,
  isAdmin: boolean,
) {
  const note = await ctx.db.get(id);
  if (!note) throw new Error("Proyecto no encontrado");
  if (!canMutate(note, actorEmail, isAdmin)) throw new Error("No autorizado");
  return note;
}

async function requireBlock(
  ctx: MutationCtx,
  id: Id<"noteBlocks">,
  actorEmail: string,
  isAdmin: boolean,
) {
  const block = await ctx.db.get(id);
  if (!block) throw new Error("Elemento no encontrado");
  const note = await requireNote(ctx, block.noteId, actorEmail, isAdmin);
  return { block, note };
}

async function touch(ctx: MutationCtx, id: Id<"notes">) {
  await ctx.db.patch(id, { updatedAt: new Date().toISOString() });
}

/* ---------- Proyectos ---------- */

export const get = query({
  args: {
    viewerEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.viewerEmail);
    if (!email) return [];

    let notes: Doc<"notes">[];
    if (args.isAdmin) {
      notes = await ctx.db.query("notes").collect();
    } else {
      const allNotes = await ctx.db.query("notes").collect();
      notes = allNotes.filter((note) =>
        hasReadAccess(note, email, args.isAdmin),
      );
    }

    const sorted = sortNotes(notes);
    return await Promise.all(
      sorted.map(async (note) => {
        const blocks = await ctx.db
          .query("noteBlocks")
          .withIndex("by_noteId_order", (q) => q.eq("noteId", note._id))
          .collect();
        const fallbackCover = blocks.find((b) => b.type === "image" && b.storageId);
        const coverStorageId = note.coverStorageId ?? fallbackCover?.storageId;
        const firstText = blocks.find(
          (b) => (b.type === "text" || b.type === "heading") && b.content,
        );
        const legacyCount =
          blocks.length === 0
            ? (note.content ? 1 : 0) + ((note.checklist?.length ?? 0) > 0 ? 1 : 0)
            : 0;
        return {
          ...note,
          blockCount: blocks.length + legacyCount,
          imageCount: blocks.filter((b) => b.type === "image").length,
          preview: firstText?.content ?? note.content ?? "",
          coverUrl: coverStorageId
            ? await ctx.storage.getUrl(coverStorageId)
            : null,
          hasCustomCover: Boolean(note.coverStorageId),
        };
      }),
    );
  },
});

export const getBoard = query({
  args: {
    id: v.id("notes"),
    viewerEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) return null;
    if (!hasReadAccess(note, args.viewerEmail, args.isAdmin)) {
      return null;
    }
    const blocks = await ctx.db
      .query("noteBlocks")
      .withIndex("by_noteId_order", (q) => q.eq("noteId", note._id))
      .collect();
    const withUrls = await Promise.all(
      blocks.map(async (block) => ({
        ...block,
        imageUrl: block.storageId
          ? await ctx.storage.getUrl(block.storageId)
          : null,
      })),
    );
    const fallbackCover = blocks.find((b) => b.type === "image" && b.storageId);
    const coverStorageId = note.coverStorageId ?? fallbackCover?.storageId;
    const coverUrl = coverStorageId
      ? await ctx.storage.getUrl(coverStorageId)
      : null;

    return {
      note: {
        ...note,
        coverUrl,
        hasCustomCover: Boolean(note.coverStorageId),
      },
      blocks: withUrls,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    checklist: checklistValidator,
    ownerEmail: v.string(),
    ownerName: v.optional(v.string()),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    const actorEmail = normalizeEmail(args.actorEmail);
    const ownerEmail = normalizeEmail(args.ownerEmail || actorEmail);

    if (!args.isAdmin && ownerEmail !== actorEmail) {
      throw new Error("No autorizado");
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("notes", {
      title: args.title.trim() || "Proyecto sin nombre",
      description: args.description?.trim() || undefined,
      content: args.content?.trim() || undefined,
      color: args.color || "neutral",
      pinned: args.pinned ?? false,
      done: false,
      checklist: args.checklist?.filter((item) => item.text.trim()) ?? [],
      ownerEmail,
      ownerName: args.ownerName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMeta = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    const patch: Partial<Doc<"notes">> = {
      updatedAt: new Date().toISOString(),
    };
    if (args.title !== undefined) {
      patch.title = args.title.trim() || "Proyecto sin nombre";
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim();
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const updateAccess = mutation({
  args: {
    id: v.id("notes"),
    visibility: visibilityValidator,
    sharedWith: v.optional(v.array(v.string())),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Proyecto no encontrado");
    if (!args.isAdmin && note.ownerEmail !== normalizeEmail(args.actorEmail)) {
      throw new Error("Solo el administrador o creador pueden definir el acceso");
    }
    await ctx.db.patch(args.id, {
      visibility: args.visibility,
      sharedWith: args.sharedWith?.map(normalizeEmail) ?? [],
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateCover = mutation({
  args: {
    id: v.id("notes"),
    storageId: v.optional(v.id("_storage")),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    await ctx.db.patch(args.id, {
      coverStorageId: args.storageId,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.string(),
    content: v.optional(v.string()),
    color: v.string(),
    pinned: v.boolean(),
    done: v.boolean(),
    checklist: checklistValidator,
    ...authArgs,
  },
  handler: async (ctx, args) => {
    await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    await ctx.db.patch(args.id, {
      title: args.title.trim() || "Proyecto sin nombre",
      content: args.content?.trim() ?? "",
      color: args.color,
      pinned: args.pinned,
      done: args.done,
      checklist: args.checklist?.filter((item) => item.text.trim()) ?? [],
      updatedAt: new Date().toISOString(),
    });
  },
});

export const toggleDone = mutation({
  args: { id: v.id("notes"), ...authArgs },
  handler: async (ctx, args) => {
    const note = await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    await ctx.db.patch(args.id, {
      done: !note.done,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const togglePinned = mutation({
  args: { id: v.id("notes"), ...authArgs },
  handler: async (ctx, args) => {
    const note = await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    await ctx.db.patch(args.id, { pinned: !note.pinned });
  },
});

export const toggleChecklistItem = mutation({
  args: { id: v.id("notes"), itemId: v.string(), ...authArgs },
  handler: async (ctx, args) => {
    const note = await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    const checklist = (note.checklist ?? []).map((item) =>
      item.id === args.itemId ? { ...item, done: !item.done } : item,
    );
    await ctx.db.patch(args.id, {
      checklist,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notes"), ...authArgs },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (!canMutate(existing, args.actorEmail, args.isAdmin)) {
      throw new Error("No autorizado");
    }
    const blocks = await ctx.db
      .query("noteBlocks")
      .withIndex("by_noteId_order", (q) => q.eq("noteId", args.id))
      .collect();
    for (const block of blocks) {
      if (block.storageId) await ctx.storage.delete(block.storageId);
      await ctx.db.delete(block._id);
    }
    await ctx.db.delete(args.id);
  },
});

/**
 * Convierte el contenido y la checklist de notas antiguas en bloques
 * del tablero. Solo actua si el proyecto todavia no tiene bloques.
 */
export const migrateLegacy = mutation({
  args: { id: v.id("notes"), ...authArgs },
  handler: async (ctx, args) => {
    const note = await requireNote(ctx, args.id, args.actorEmail, args.isAdmin);
    const existing = await ctx.db
      .query("noteBlocks")
      .withIndex("by_noteId_order", (q) => q.eq("noteId", args.id))
      .first();
    if (existing) return;

    const now = new Date().toISOString();
    let order = 0;
    if (note.content?.trim()) {
      await ctx.db.insert("noteBlocks", {
        noteId: args.id,
        type: "text",
        content: note.content,
        order: order++,
        createdAt: now,
      });
    }
    if ((note.checklist?.length ?? 0) > 0) {
      await ctx.db.insert("noteBlocks", {
        noteId: args.id,
        type: "checklist",
        checklist: note.checklist,
        order: order++,
        createdAt: now,
      });
    }
    if (order > 0) {
      await ctx.db.patch(args.id, { content: "", checklist: [] });
    }
  },
});

/* ---------- Bloques del tablero ---------- */

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addBlock = mutation({
  args: {
    noteId: v.id("notes"),
    type: blockTypeValidator,
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    checklist: checklistValidator,
    tableData: tableDataValidator,
    wide: v.optional(v.boolean()),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    await requireNote(ctx, args.noteId, args.actorEmail, args.isAdmin);
    const last = await ctx.db
      .query("noteBlocks")
      .withIndex("by_noteId_order", (q) => q.eq("noteId", args.noteId))
      .order("desc")
      .first();
    const now = new Date().toISOString();
    const id = await ctx.db.insert("noteBlocks", {
      noteId: args.noteId,
      type: args.type,
      content: args.content,
      url: args.url,
      storageId: args.storageId,
      checklist: args.checklist,
      tableData: args.tableData,
      wide: args.wide,
      order: (last?.order ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
    });
    await touch(ctx, args.noteId);
    return id;
  },
});

export const updateBlock = mutation({
  args: {
    id: v.id("noteBlocks"),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    checklist: checklistValidator,
    tableData: tableDataValidator,
    wide: v.optional(v.boolean()),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    const { block } = await requireBlock(
      ctx,
      args.id,
      args.actorEmail,
      args.isAdmin,
    );
    const patch: Partial<Doc<"noteBlocks">> = {
      updatedAt: new Date().toISOString(),
    };
    if (args.content !== undefined) patch.content = args.content;
    if (args.url !== undefined) patch.url = args.url.trim();
    if (args.checklist !== undefined) patch.checklist = args.checklist;
    if (args.tableData !== undefined) patch.tableData = args.tableData;
    if (args.wide !== undefined) patch.wide = args.wide;
    await ctx.db.patch(args.id, patch);
    await touch(ctx, block.noteId);
  },
});

/** Reescribe el orden completo del tablero segun la lista recibida. */
export const reorderBlocks = mutation({
  args: {
    noteId: v.id("notes"),
    orderedIds: v.array(v.id("noteBlocks")),
    ...authArgs,
  },
  handler: async (ctx, args) => {
    await requireNote(ctx, args.noteId, args.actorEmail, args.isAdmin);
    for (const [index, id] of args.orderedIds.entries()) {
      const block = await ctx.db.get(id);
      if (!block || block.noteId !== args.noteId) continue;
      if (block.order !== index) await ctx.db.patch(id, { order: index });
    }
    await touch(ctx, args.noteId);
  },
});

export const removeBlock = mutation({
  args: { id: v.id("noteBlocks"), ...authArgs },
  handler: async (ctx, args) => {
    const { block } = await requireBlock(
      ctx,
      args.id,
      args.actorEmail,
      args.isAdmin,
    );
    if (block.storageId) await ctx.storage.delete(block.storageId);
    await ctx.db.delete(args.id);
    await touch(ctx, block.noteId);
  },
});
