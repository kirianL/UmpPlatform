import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listBoards = query({
  args: {},
  handler: async (ctx) => {
    const boards = await ctx.db
      .query("brainstormBoards")
      .order("desc")
      .collect();
    const items = await ctx.db.query("brainstormItems").collect();

    // Map item counts and client details to each board
    return Promise.all(
      boards.map(async (b) => {
        let client = null;
        if (b.clientId) {
          client = await ctx.db.get(b.clientId);
        }
        const itemCount = items.filter((i) => i.boardId === b._id).length;
        return {
          ...b,
          client,
          itemCount,
        };
      }),
    );
  },
});

export const createBoard = mutation({
  args: {
    title: v.string(),
    clientId: v.optional(v.id("clients")),
    coverUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("brainstormBoards", {
      title: args.title,
      clientId: args.clientId,
      coverUrl: args.coverUrl,
      color: args.color || "#3b82f6",
      description: args.description,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateBoard = mutation({
  args: {
    id: v.id("brainstormBoards"),
    title: v.string(),
    coverUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const removeBoard = mutation({
  args: {
    id: v.id("brainstormBoards"),
  },
  handler: async (ctx, args) => {
    // Delete all items in this board
    const items = await ctx.db
      .query("brainstormItems")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    const board = await ctx.db.get(args.id);
    if (board) {
      await ctx.db.delete(args.id);
    }
  },
});

export const listItems = query({
  args: {
    boardId: v.id("brainstormBoards"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brainstormItems")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .collect();
  },
});

export const createItem = mutation({
  args: {
    boardId: v.id("brainstormBoards"),
    type: v.union(
      v.literal("note"),
      v.literal("image"),
      v.literal("color"),
      v.literal("checklist"),
      v.literal("link"),
    ),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    url: v.optional(v.string()),
    checklist: v.optional(
      v.array(
        v.object({
          text: v.string(),
          done: v.boolean(),
        }),
      ),
    ),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("brainstormItems", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("brainstormItems"),
    boardId: v.optional(v.id("brainstormBoards")),
    type: v.optional(
      v.union(
        v.literal("note"),
        v.literal("image"),
        v.literal("color"),
        v.literal("checklist"),
        v.literal("link"),
      ),
    ),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    url: v.optional(v.string()),
    checklist: v.optional(
      v.array(
        v.object({
          text: v.string(),
          done: v.boolean(),
        }),
      ),
    ),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
  },
  handler: async (ctx, { id, boardId, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const updateItemPosition = mutation({
  args: {
    id: v.id("brainstormItems"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, { id, positionX, positionY }) => {
    await ctx.db.patch(id, { positionX, positionY });
  },
});

export const removeItem = mutation({
  args: {
    id: v.id("brainstormItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (item) {
      await ctx.db.delete(args.id);
    }
  },
});
