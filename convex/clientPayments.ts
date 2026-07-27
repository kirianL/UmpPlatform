import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function updateServiceStatus(ctx: any, serviceId: any) {
  if (!serviceId) return;
  const service = await ctx.db.get(serviceId);
  if (!service) return;

  const payments = await ctx.db
    .query("clientPayments")
    .withIndex("by_serviceId", (q: any) => q.eq("serviceId", serviceId))
    .collect();

  const totalPaid = payments
    .filter((p: any) => p.status === "paid")
    .reduce((acc: number, p: any) => acc + p.amount, 0);

  let newStatus: "pagado" | "parcial" | "pendiente" | "sin_pago" = "pendiente";
  if (totalPaid >= service.amount && service.amount > 0) {
    newStatus = "pagado";
  } else if (totalPaid > 0) {
    newStatus = "parcial";
  } else {
    newStatus = "pendiente";
  }

  await ctx.db.patch(serviceId, { paymentStatus: newStatus });
}

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientPayments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clientPayments").collect();
  },
});

export const createPayment = mutation({
  args: {
    clientId: v.id("clients"),
    serviceId: v.optional(v.id("clientServices")),
    amount: v.number(),
    date: v.string(),
    concept: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    const clientInfo = client ? `${client.name} - ${client.company}` : "Cliente";
    
    let serviceInfo = "";
    if (args.serviceId) {
      const service = await ctx.db.get(args.serviceId);
      if (service) {
        serviceInfo = ` [${service.serviceName}]`;
      }
    }

    const fullConcept = args.concept.trim()
      ? `${args.concept.trim()}${serviceInfo} (${clientInfo})`
      : `Pago de cliente${serviceInfo} - ${clientInfo}`;

    // 1. Crear transacción en el módulo de Finanzas
    const transactionId = await ctx.db.insert("transactions", {
      concept: fullConcept,
      amount: args.amount,
      date: args.date,
      category: "Producción",
      type: "income",
      status: args.status === "paid" ? "paid" : "pending",
      clientId: args.clientId,
    });

    // 2. Crear el pago registrado para el cliente
    const paymentId = await ctx.db.insert("clientPayments", {
      clientId: args.clientId,
      serviceId: args.serviceId,
      transactionId: transactionId,
      amount: args.amount,
      date: args.date,
      concept: args.concept.trim() || `Pago de ${clientInfo}`,
      status: args.status,
    });

    // 3. Actualizar la última interacción del cliente
    if (client) {
      await ctx.db.patch(args.clientId, {
        lastInteraction: args.date,
      });
    }

    // 4. Actualizar el estado de pago del servicio si está asociado
    if (args.serviceId) {
      await updateServiceStatus(ctx, args.serviceId);
    }

    return paymentId;
  },
});

export const updatePayment = mutation({
  args: {
    id: v.id("clientPayments"),
    amount: v.number(),
    date: v.string(),
    concept: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending")),
  },
  handler: async (ctx, { id, ...args }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;

    await ctx.db.patch(id, args);

    // Actualizar transacción vinculada en Finanzas si existe
    if (existing.transactionId) {
      const client = await ctx.db.get(existing.clientId);
      const clientInfo = client ? `${client.name} - ${client.company}` : "Cliente";
      const fullConcept = args.concept.trim()
        ? `${args.concept.trim()} (${clientInfo})`
        : `Pago de cliente - ${clientInfo}`;

      const tx = await ctx.db.get(existing.transactionId);
      if (tx) {
        await ctx.db.patch(existing.transactionId, {
          concept: fullConcept,
          amount: args.amount,
          date: args.date,
          status: args.status === "paid" ? "paid" : "pending",
        });
      }
    }

    if (existing.serviceId) {
      await updateServiceStatus(ctx, existing.serviceId);
    }
  },
});

export const removePayment = mutation({
  args: { id: v.id("clientPayments") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      if (existing.transactionId) {
        const tx = await ctx.db.get(existing.transactionId);
        if (tx) {
          await ctx.db.delete(existing.transactionId);
        }
      }
      await ctx.db.delete(args.id);

      if (existing.serviceId) {
        await updateServiceStatus(ctx, existing.serviceId);
      }
    }
  },
});
