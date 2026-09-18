import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const checklistValidator = v.optional(
  v.array(
    v.object({
      id: v.string(),
      text: v.string(),
      done: v.boolean(),
    }),
  ),
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sortNotes(notes: Doc<"notes">[]) {
  return notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function canMutate(note: Doc<"notes">, actorEmail: string, isAdmin: boolean) {
  if (isAdmin) return true;
  return note.ownerEmail === normalizeEmail(actorEmail);
}

export const get = query({
  args: {
    viewerEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.isAdmin) {
      const notes = await ctx.db.query("notes").order("desc").collect();
      return sortNotes(notes);
    }

    const email = normalizeEmail(args.viewerEmail);
    if (!email) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_ownerEmail", (q) => q.eq("ownerEmail", email))
      .collect();
    return sortNotes(notes);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    checklist: checklistValidator,
    ownerEmail: v.string(),
    ownerName: v.optional(v.string()),
    actorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actorEmail = normalizeEmail(args.actorEmail);
    const ownerEmail = normalizeEmail(args.ownerEmail || actorEmail);

    if (!args.isAdmin && ownerEmail !== actorEmail) {
      throw new Error("No autorizado");
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("notes", {
      title: args.title.trim() || "Nota sin título",
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

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.string(),
    content: v.optional(v.string()),
    color: v.string(),
    pinned: v.boolean(),
    done: v.boolean(),
    checklist: checklistValidator,
    actorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (!canMutate(existing, args.actorEmail, args.isAdmin)) {
      throw new Error("No autorizado");
    }

    await ctx.db.patch(args.id, {
      title: args.title.trim() || "Nota sin título",
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
  args: {
    id: v.id("notes"),
    actorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (!canMutate(existing, args.actorEmail, args.isAdmin)) {
      throw new Error("No autorizado");
    }

    await ctx.db.patch(args.id, {
      done: !existing.done,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const togglePinned = mutation({
  args: {
    id: v.id("notes"),
    actorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (!canMutate(existing, args.actorEmail, args.isAdmin)) {
      throw new Error("No autorizado");
    }

    await ctx.db.patch(args.id, {
      pinned: !existing.pinned,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const toggleChecklistItem = mutation({
  args: {
    id: v.id("notes"),
    itemId: v.string(),
    actorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (!canMutate(existing, args.actorEmail, args.isAdmin)) {
      throw new Error("No autorizado");
    }

    const checklist = (existing.checklist ?? []).map((item) =>
      item.id === args.itemId ? { ...item, done: !item.done } : item,
    );

    await ctx.db.patch(args.id, {
      checklist,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("notes"),
    actorEmail: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (!canMutate(existing, args.actorEmail, args.isAdmin)) {
      throw new Error("No autorizado");
    }
    await ctx.db.delete(args.id);
  },
});
