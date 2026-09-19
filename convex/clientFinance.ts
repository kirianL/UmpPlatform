import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";

type PaymentStatus = "pagado" | "parcial" | "pendiente" | "sin_pago";

export function clientLabel(
  client: { name: string; company?: string } | null | undefined,
) {
  if (!client) return "Cliente";
  return client.company ? `${client.name} - ${client.company}` : client.name;
}

export function linksToFinance(
  client: { type?: "activo" | "potencial" } | null | undefined,
) {
  return !!client && client.type !== "potencial";
}

function serviceFields(
  service: Doc<"clientServices">,
  patch: Partial<
    Pick<
      Doc<"clientServices">,
      | "serviceName"
      | "amount"
      | "paymentStatus"
      | "contractDate"
      | "transactionId"
    >
  > & { clearTransactionId?: boolean } = {},
) {
  const transactionId = patch.clearTransactionId
    ? undefined
    : (patch.transactionId ?? service.transactionId);

  return {
    clientId: service.clientId,
    serviceName: patch.serviceName ?? service.serviceName,
    amount: patch.amount ?? service.amount,
    paymentStatus: patch.paymentStatus ?? service.paymentStatus,
    contractDate: patch.contractDate ?? service.contractDate,
    ...(transactionId ? { transactionId } : {}),
  };
}

export async function replaceClientService(
  ctx: MutationCtx,
  service: Doc<"clientServices">,
  patch: Partial<
    Pick<
      Doc<"clientServices">,
      | "serviceName"
      | "amount"
      | "paymentStatus"
      | "contractDate"
      | "transactionId"
    >
  > & { clearTransactionId?: boolean } = {},
) {
  await ctx.db.replace(service._id, serviceFields(service, patch));
}

async function paymentFields(
  payment: Doc<"clientPayments">,
  transactionId?: Id<"transactions">,
) {
  return {
    clientId: payment.clientId,
    amount: payment.amount,
    date: payment.date,
    concept: payment.concept,
    status: payment.status,
    ...(payment.serviceId ? { serviceId: payment.serviceId } : {}),
    ...(transactionId ? { transactionId } : {}),
  };
}

async function clearPaymentTransaction(
  ctx: MutationCtx,
  payment: Doc<"clientPayments">,
) {
  if (!payment.transactionId) return;
  const tx = await ctx.db.get(payment.transactionId);
  if (tx) {
    await ctx.db.delete(payment.transactionId);
  }
  await ctx.db.replace(payment._id, await paymentFields(payment));
}

export async function unlinkServiceFinance(
  ctx: MutationCtx,
  serviceId: Id<"clientServices">,
) {
  const service = await ctx.db.get(serviceId);
  if (!service) return;

  if (service.transactionId) {
    const tx = await ctx.db.get(service.transactionId);
    if (tx) {
      await ctx.db.delete(service.transactionId);
    }
    await replaceClientService(ctx, service, { clearTransactionId: true });
  }

  const payments = await ctx.db
    .query("clientPayments")
    .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
    .collect();

  for (const payment of payments) {
    await clearPaymentTransaction(ctx, payment);
  }
}

async function ensurePaymentFinance(
  ctx: MutationCtx,
  payment: Doc<"clientPayments">,
) {
  if (payment.transactionId) {
    const existing = await ctx.db.get(payment.transactionId);
    if (existing) return;
  }

  const client = await ctx.db.get(payment.clientId);
  let serviceInfo = "";
  if (payment.serviceId) {
    const service = await ctx.db.get(payment.serviceId);
    if (service) {
      serviceInfo = ` [${service.serviceName}]`;
    }
  }

  const clientInfo = clientLabel(client);
  const fullConcept = payment.concept.trim()
    ? `${payment.concept.trim()}${serviceInfo} (${clientInfo})`
    : `Pago de cliente${serviceInfo} - ${clientInfo}`;

  const transactionId = await ctx.db.insert("transactions", {
    concept: fullConcept,
    amount: payment.amount,
    date: payment.date,
    category: "Producción",
    type: "income",
    status: payment.status === "paid" ? "paid" : "pending",
    local: client?.company || client?.name || "Cliente",
    clientId: payment.clientId,
    source: "client_payment",
  });

  await ctx.db.replace(payment._id, await paymentFields(payment, transactionId));
}

export async function syncClientFinanceState(
  ctx: MutationCtx,
  clientId: Id<"clients">,
) {
  const client = await ctx.db.get(clientId);
  if (!client) return;

  const services = await ctx.db
    .query("clientServices")
    .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
    .collect();
  const payments = await ctx.db
    .query("clientPayments")
    .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
    .collect();

  if (!linksToFinance(client)) {
    for (const service of services) {
      await unlinkServiceFinance(ctx, service._id);
    }
    for (const payment of payments) {
      await clearPaymentTransaction(ctx, payment);
    }
    return;
  }

  for (const payment of payments) {
    await ensurePaymentFinance(ctx, payment);
  }
  for (const service of services) {
    await refreshServicePaymentStatus(ctx, service._id);
    await syncServiceReceivable(ctx, service._id);
  }
}

export async function getServicePaymentTotals(
  ctx: MutationCtx,
  serviceId: Id<"clientServices">,
) {
  const payments = await ctx.db
    .query("clientPayments")
    .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
    .collect();

  const paid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return { paid, pending, payments };
}

export async function refreshServicePaymentStatus(
  ctx: MutationCtx,
  serviceId: Id<"clientServices"> | undefined,
) {
  if (!serviceId) return;
  const service = await ctx.db.get(serviceId);
  if (!service) return;

  const { paid } = await getServicePaymentTotals(ctx, serviceId);

  let newStatus: PaymentStatus =
    service.paymentStatus === "sin_pago" && paid === 0
      ? "sin_pago"
      : "pendiente";

  if (paid >= service.amount && service.amount > 0) {
    newStatus = "pagado";
  } else if (paid > 0) {
    newStatus = "parcial";
  }

  if (newStatus !== service.paymentStatus) {
    await replaceClientService(ctx, service, { paymentStatus: newStatus });
  }
}

export async function syncServiceReceivable(
  ctx: MutationCtx,
  serviceId: Id<"clientServices"> | undefined,
) {
  if (!serviceId) return;
  const service = await ctx.db.get(serviceId);
  if (!service) return;

  const client = await ctx.db.get(service.clientId);
  if (!linksToFinance(client)) {
    await unlinkServiceFinance(ctx, serviceId);
    return;
  }

  const { paid, pending } = await getServicePaymentTotals(ctx, serviceId);
  const writeOff = service.paymentStatus === "sin_pago" && paid === 0;
  const remaining = writeOff ? 0 : Math.max(0, service.amount - paid - pending);

  if (remaining <= 0) {
    if (service.transactionId) {
      const tx = await ctx.db.get(service.transactionId);
      if (tx) {
        await ctx.db.delete(service.transactionId);
      }
      await replaceClientService(ctx, service, { clearTransactionId: true });
    }
    return;
  }

  const payload = {
    concept: `Saldo pendiente [${service.serviceName}] (${clientLabel(client)})`,
    amount: remaining,
    date: service.contractDate,
    category: "Producción",
    type: "income" as const,
    status: "pending" as const,
    local: client?.company || client?.name || "Cliente",
    clientId: service.clientId as string,
    source: "client_receivable" as const,
  };

  if (service.transactionId) {
    const tx = await ctx.db.get(service.transactionId);
    if (tx) {
      const alreadySynced =
        tx.amount === remaining &&
        tx.status === "pending" &&
        tx.concept === payload.concept &&
        tx.date === payload.date &&
        tx.source === "client_receivable";
      if (!alreadySynced) {
        await ctx.db.patch(service.transactionId, payload);
      }
      return;
    }
  }

  const transactionId = await ctx.db.insert("transactions", payload);
  const latest = await ctx.db.get(serviceId);
  if (latest?.transactionId && latest.transactionId !== transactionId) {
    await ctx.db.delete(transactionId);
    return;
  }
  await replaceClientService(ctx, latest ?? service, { transactionId });
}

export async function insertClientPayment(
  ctx: MutationCtx,
  args: {
    clientId: Id<"clients">;
    serviceId?: Id<"clientServices">;
    amount: number;
    date: string;
    concept: string;
    status: "paid" | "pending";
    transactionId?: Id<"transactions">;
  },
) {
  const client = await ctx.db.get(args.clientId);
  const linkFinance = linksToFinance(client);
  const clientInfo = clientLabel(client);

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

  let transactionId = linkFinance ? args.transactionId : undefined;
  if (linkFinance) {
    if (!transactionId) {
      transactionId = await ctx.db.insert("transactions", {
        concept: fullConcept,
        amount: args.amount,
        date: args.date,
        category: "Producción",
        type: "income",
        status: args.status === "paid" ? "paid" : "pending",
        local: client?.company || client?.name || "Cliente",
        clientId: args.clientId,
        source: "client_payment",
      });
    } else {
      await ctx.db.patch(transactionId, {
        concept: fullConcept,
        amount: args.amount,
        date: args.date,
        status: args.status === "paid" ? "paid" : "pending",
        local: client?.company || client?.name || "Cliente",
        clientId: args.clientId,
        source: "client_payment",
      });
    }
  }

  const paymentId = await ctx.db.insert("clientPayments", {
    clientId: args.clientId,
    serviceId: args.serviceId,
    ...(transactionId ? { transactionId } : {}),
    amount: args.amount,
    date: args.date,
    concept: args.concept.trim() || `Pago de ${clientInfo}`,
    status: args.status,
  });

  if (client) {
    await ctx.db.patch(args.clientId, {
      lastInteraction: args.date,
    });
  }

  if (args.serviceId) {
    await refreshServicePaymentStatus(ctx, args.serviceId);
    if (linkFinance) {
      await syncServiceReceivable(ctx, args.serviceId);
    } else {
      await unlinkServiceFinance(ctx, args.serviceId);
    }
  }

  return paymentId;
}

export async function deleteServiceFinanceLinks(
  ctx: MutationCtx,
  serviceId: Id<"clientServices">,
) {
  const service = await ctx.db.get(serviceId);
  if (!service) return;

  const payments = await ctx.db
    .query("clientPayments")
    .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
    .collect();

  for (const payment of payments) {
    if (payment.transactionId) {
      const tx = await ctx.db.get(payment.transactionId);
      if (tx) {
        await ctx.db.delete(payment.transactionId);
      }
    }
    await ctx.db.delete(payment._id);
  }

  if (service.transactionId) {
    const tx = await ctx.db.get(service.transactionId);
    if (tx) {
      await ctx.db.delete(service.transactionId);
    }
  }
}

export const syncAllReceivables = mutation({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    for (const client of clients) {
      await syncClientFinanceState(ctx, client._id);
    }

    const linkedIds = new Set(
      (await ctx.db.query("clientServices").collect())
        .map((service) => service.transactionId)
        .filter((id): id is NonNullable<typeof id> => !!id),
    );
    const paymentTxIds = new Set(
      (await ctx.db.query("clientPayments").collect())
        .map((payment) => payment.transactionId)
        .filter((id): id is NonNullable<typeof id> => !!id),
    );
    const allTransactions = await ctx.db.query("transactions").collect();
    let removedOrphans = 0;
    for (const tx of allTransactions) {
      if (tx.source === "client_receivable") {
        if (linkedIds.has(tx._id) || paymentTxIds.has(tx._id)) continue;
        await ctx.db.delete(tx._id);
        removedOrphans += 1;
        continue;
      }
      if (tx.source === "client_payment") {
        if (paymentTxIds.has(tx._id)) continue;
        await ctx.db.delete(tx._id);
        removedOrphans += 1;
      }
    }

    return { clients: clients.length, removedOrphans };
  },
});
