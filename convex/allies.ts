import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateAllyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "AL-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("allies").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("allies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    return await ctx.db
      .query("allies")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
  },
});

export const createPublic = mutation({
  args: {
    fullName: v.string(),
    idCard: v.string(),
    phone: v.string(),
    email: v.string(),
    whatsappOptIn: v.boolean(),
    package: v.union(v.literal("elite"), v.literal("vip")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.fullName.trim();
    const trimmedIdCard = args.idCard.trim();
    const trimmedPhone = args.phone.trim();
    const trimmedEmail = args.email.trim().toLowerCase();

    if (!trimmedName) {
      throw new Error("El nombre completo es requerido.");
    }
    if (!trimmedIdCard) {
      throw new Error("La cédula o identificación es requerida.");
    }
    if (!trimmedPhone) {
      throw new Error("El número de celular es requerido.");
    }
    if (!trimmedEmail) {
      throw new Error("El correo electrónico es requerido.");
    }

    const packageAmount = args.package === "vip" ? 12000 : 10000;
    const createdAt = new Date().toISOString();
    const code = generateAllyCode();

    const allyId = await ctx.db.insert("allies", {
      fullName: trimmedName,
      idCard: trimmedIdCard,
      phone: trimmedPhone,
      email: trimmedEmail,
      whatsappOptIn: args.whatsappOptIn,
      package: args.package,
      packageAmount,
      status: "no_pagado",
      paymentStatus: "no_pagado",
      code,
      notes: args.notes?.trim() || undefined,
      createdAt,
    });

    return { allyId, code };
  },
});

export const create = mutation({
  args: {
    fullName: v.string(),
    idCard: v.string(),
    phone: v.string(),
    email: v.string(),
    whatsappOptIn: v.boolean(),
    package: v.union(v.literal("elite"), v.literal("vip")),
    packageAmount: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pagado"),
        v.literal("no_pagado"),
        v.literal("pendiente"),
        v.literal("activo"),
        v.literal("inactivo"),
      ),
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("pagado"),
        v.literal("no_pagado"),
        v.literal("pendiente"),
        v.literal("cancelado"),
      ),
    ),
    code: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const packageAmount =
      args.packageAmount ?? (args.package === "vip" ? 12000 : 10000);
    const createdAt = args.createdAt || new Date().toISOString();
    const status = args.status || "no_pagado";
    const paymentStatus = args.paymentStatus || (status === "pagado" ? "pagado" : "no_pagado");
    const code = args.code?.trim().toUpperCase() || generateAllyCode();

    return await ctx.db.insert("allies", {
      fullName: args.fullName.trim(),
      idCard: args.idCard.trim(),
      phone: args.phone.trim(),
      email: args.email.trim().toLowerCase(),
      whatsappOptIn: args.whatsappOptIn,
      package: args.package,
      packageAmount,
      status,
      paymentStatus,
      code,
      notes: args.notes?.trim() || undefined,
      createdAt,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("allies"),
    fullName: v.optional(v.string()),
    idCard: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsappOptIn: v.optional(v.boolean()),
    package: v.optional(v.union(v.literal("elite"), v.literal("vip"))),
    packageAmount: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pagado"),
        v.literal("no_pagado"),
        v.literal("pendiente"),
        v.literal("activo"),
        v.literal("inactivo"),
      ),
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("pagado"),
        v.literal("no_pagado"),
        v.literal("pendiente"),
        v.literal("cancelado"),
      ),
    ),
    code: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const patchData: Record<string, any> = { ...args };
    if (args.package && args.packageAmount === undefined) {
      patchData.packageAmount = args.package === "vip" ? 12000 : 10000;
    }
    if (args.fullName) patchData.fullName = args.fullName.trim();
    if (args.idCard) patchData.idCard = args.idCard.trim();
    if (args.phone) patchData.phone = args.phone.trim();
    if (args.email) patchData.email = args.email.trim().toLowerCase();
    if (args.code) patchData.code = args.code.trim().toUpperCase();

    await ctx.db.patch(id, patchData);
  },
});

export const remove = mutation({
  args: { id: v.id("allies") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
