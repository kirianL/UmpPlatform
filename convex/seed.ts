import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if database is already seeded
    const existing = await ctx.db.query("employees").collect();
    if (existing.length > 0) return "Database already seeded";

    // Seed employees
    const employees = [
      { name: "Andrés Monge", role: "Director de Fotografía", phone: "8899-7766", email: "andres@umpproducciones.com", salary: 750000, status: "active" as const, episodeCount: 12, avatarInitials: "AM" },
      { name: "Valeria Quirós", role: "Productora General", phone: "8765-4321", email: "valeria@umpproducciones.com", salary: 850000, status: "active" as const, episodeCount: 15, avatarInitials: "VQ" },
      { name: "Gabriel Soto", role: "Editor / Colorista", phone: "8333-2211", email: "gabriel@umpproducciones.com", salary: 600000, status: "active" as const, episodeCount: 8, avatarInitials: "GS" },
      { name: "Lucía Méndez", role: "Sonidista", phone: "8555-4433", email: "lucia@gmail.com", salary: 500000, status: "inactive" as const, episodeCount: 4, avatarInitials: "LM" },
    ];
    for (const e of employees) {
      await ctx.db.insert("employees", e);
    }

    // Seed clients
    const clients = [
      { name: "Laura Sánchez", company: "Streaming MX", phone: "555-0199", email: "laura@streamingmx.com", lastInteraction: "2026-06-25", projectCount: 3 },
      { name: "Fernando Reyes", company: "Lumina Brands", phone: "555-0188", email: "fernando@lumina.mx", lastInteraction: "2026-06-22", projectCount: 2 },
      { name: "Patricia Gómez", company: "Canal 7 Media", phone: "555-0177", email: "patricia@canal7.tv", lastInteraction: "2026-06-28", projectCount: 5 },
      { name: "Andrés Morales", company: "Reyes Distribución", phone: "555-0166", email: "andres@reyesdist.com", lastInteraction: "2026-06-18", projectCount: 1 },
    ];
    for (const c of clients) {
      await ctx.db.insert("clients", c);
    }

    // Seed equipment
    const equipment = [
      { name: "Sony FX6 Cinema Line", serialNumber: "FX6-99281A", category: "camera", status: "available" as const, location: "Casillero A1", acquisitionDate: "2024-05-15" },
      { name: "Lente Sony 24-70mm f/2.8 GM II", serialNumber: "SEL2470GM2-01", category: "lens", status: "available" as const, location: "Casillero B3", acquisitionDate: "2024-06-10" },
      { name: "Aputure LS 600d Pro", serialNumber: "AP-600D-8812", category: "lighting", status: "in-use" as const, location: "Rodaje 'Horizontes'", acquisitionDate: "2025-01-20" },
      { name: "Sennheiser MKH416 Shotgun Mic", serialNumber: "SEN-416-092", category: "audio", status: "available" as const, location: "Casillero C2", acquisitionDate: "2023-11-05" },
    ];
    for (const eq of equipment) {
      await ctx.db.insert("equipment", eq);
    }

    // Seed transactions
    const transactions = [
      { concept: "Pago de cliente: Streaming MX — Serie Ep. 3", amount: 1500000, date: "2026-06-25", category: "Producción", type: "income" as const, status: "paid" as const },
      { concept: "Alquiler de Luces Adicionales — Rodaje Ep. 4", amount: 120000, date: "2026-06-24", category: "Alquileres", type: "expense" as const, status: "paid" as const },
      { concept: "Servicios Profesionales: Sonidista Externo", amount: 80000, date: "2026-06-28", category: "Honorarios", type: "expense" as const, status: "pending" as const },
      { concept: "Cobro Anticipado: Spot Lumina Brands", amount: 500000, date: "2026-06-20", category: "Publicidad", type: "income" as const, status: "paid" as const },
    ];
    for (const t of transactions) {
      await ctx.db.insert("transactions", t);
    }

    // Seed deals
    const deals = [
      { title: "Serie 'Ecos del Mar' — T1", client: "Streaming MX", value: 1200000, stage: "negotiation" as const, priority: "high" as const, createdAt: "2026-05-10", expectedClose: "2026-07-15", description: "Serie dramática de 8 episodios.", contactEmail: "laura@streamingmx.com" },
      { title: "Comercial Navidad — Lumina", client: "Lumina Brands", value: 150000, stage: "proposal" as const, priority: "medium" as const, createdAt: "2026-06-01", expectedClose: "2026-07-01", description: "Spot de 30s para campaña navideña.", contactEmail: "fernando@lumina.mx" },
      { title: "Documental 'Voces Urbanas'", client: "Canal 7 Media", value: 450000, stage: "won" as const, priority: "high" as const, createdAt: "2026-04-20", expectedClose: "2026-06-20", description: "Documental de 3 episodios.", contactEmail: "patricia@canal7.tv" },
    ];
    for (const d of deals) {
      await ctx.db.insert("deals", d);
    }

    // Seed events
    const events = [
      { title: "Rodaje Ep. 5 — Horizontes", date: "2026-06-12", time: "08:00", type: "shooting" as const, description: "Locación exterior en Heredia.", status: "completed" as const },
      { title: "Reunión con Canal 7", date: "2026-06-15", time: "11:00", type: "meeting" as const, description: "Presentación de propuesta.", status: "completed" as const },
      { title: "Rodaje Ep. 6 — Horizontes", date: "2026-06-18", time: "06:30", type: "shooting" as const, description: "Llamado temprano.", status: "upcoming" as const },
    ];
    for (const ev of events) {
      await ctx.db.insert("events", ev);
    }

    return "Database seeded successfully";
  },
});
