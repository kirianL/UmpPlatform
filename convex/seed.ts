import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Ensure test users exist with correct roles
    const adminUser = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", "admin@ultimate.cr")).first();
    if (adminUser) {
      await ctx.db.patch(adminUser._id, {
        name: "Administrador UMP",
        passwordHash: "5284374ea2c89a14d071994d8e84bc4ec7a4c9e5abcbea27d86cb130550510cf",
        role: "admin",
      });
    } else {
      await ctx.db.insert("users", {
        email: "admin@ultimate.cr",
        name: "Administrador UMP",
        passwordHash: "5284374ea2c89a14d071994d8e84bc4ec7a4c9e5abcbea27d86cb130550510cf",
        role: "admin",
      });
    }

    const prodUser = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", "produccion@ultimate.cr")).first();
    if (prodUser) {
      await ctx.db.patch(prodUser._id, {
        name: "Producción UMP",
        passwordHash: "f22ff8824c832bf9a32853e3b51d8a6ddc4b02042716dd41d085dcc1173952ac",
        role: "produccion",
      });
    } else {
      await ctx.db.insert("users", {
        email: "produccion@ultimate.cr",
        name: "Producción UMP",
        passwordHash: "f22ff8824c832bf9a32853e3b51d8a6ddc4b02042716dd41d085dcc1173952ac",
        role: "produccion",
      });
    }

    const eymarUser = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", "eymar@ultimate.cr")).first();
    if (eymarUser) {
      await ctx.db.patch(eymarUser._id, {
        name: "Eymar",
        passwordHash: "703f07d7bb546836ef8f7beb4109453f6ce51123ac2f3cb8ba48f0f1c664b1d0",
        role: "produccion",
      });
    } else {
      await ctx.db.insert("users", {
        email: "eymar@ultimate.cr",
        name: "Eymar",
        passwordHash: "703f07d7bb546836ef8f7beb4109453f6ce51123ac2f3cb8ba48f0f1c664b1d0",
        role: "produccion",
      });
    }

    // Check if other data is already seeded
    const existing = await ctx.db.query("employees").collect();
    if (existing.length > 0) return "Users upserted. Database other tables already seeded.";

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

    // Seed analyticsStats
    const analyticsStats = [
      { platform: "all" as const, followers: 325300, followersGrowth: "+9.1%", views: 1485000, viewsGrowth: "+26.8%", engagement: "8.2%", engagementGrowth: "+1.5%", shares: 61400, sharesGrowth: "+17.2%", watchTime: "52,400 h", avgRetention: "58.4%" },
      { platform: "youtube" as const, followers: 120000, followersGrowth: "+6.1%", views: 450000, viewsGrowth: "+18.5%", engagement: "9.2%", engagementGrowth: "+0.8%", shares: 12500, sharesGrowth: "+10.2%", watchTime: "31,200 h", avgRetention: "64.2%" },
      { platform: "instagram" as const, followers: 85000, followersGrowth: "+12.4%", views: 380000, viewsGrowth: "+35.1%", engagement: "6.8%", engagementGrowth: "+2.1%", shares: 18400, sharesGrowth: "+22.5%", watchTime: "8,500 h", avgRetention: "48.5%" },
      { platform: "tiktok" as const, followers: 40300, followersGrowth: "+22.8%", views: 375000, viewsGrowth: "+45.2%", engagement: "14.2%", engagementGrowth: "+4.5%", shares: 18000, sharesGrowth: "+38.4%", watchTime: "6,200 h", avgRetention: "42.1%" },
      { platform: "facebook" as const, followers: 80000, followersGrowth: "+5.3%", views: 280000, viewsGrowth: "+14.8%", engagement: "5.4%", engagementGrowth: "+0.5%", shares: 12500, sharesGrowth: "+12.1%", watchTime: "6,500 h", avgRetention: "51.8%" }
    ];
    for (const stat of analyticsStats) {
      await ctx.db.insert("analyticsStats", stat);
    }

    // Seed topContent
    const topContent = [
      { title: "Detrás de Cámaras: Serie 'Horizontes' — Ep. 5", platform: "youtube" as const, views: 185000, likes: 15400, watchTime: "12,400 h", retention: "64.2%", duration: "14:20", date: "Hace 5 días" },
      { title: "Sony FX6 vs Red Komodo: Comparativa Real", platform: "youtube" as const, views: 142000, likes: 12100, watchTime: "9,800 h", retention: "58.4%", duration: "18:45", date: "Hace 12 días" },
      { title: "Reel: Iluminación de Cine en Espacios Pequeños", platform: "instagram" as const, views: 245000, likes: 28400, watchTime: "4,200 h", retention: "72.5%", duration: "0:58", date: "Hace 3 días" },
      { title: "Cómo grabar audio limpio en exteriores", platform: "tiktok" as const, views: 310000, likes: 35200, watchTime: "3,800 h", retention: "68.2%", duration: "0:45", date: "Hace 2 días" },
      { title: "Anuncio de Estreno: Documental 'Voces'", platform: "facebook" as const, views: 98000, likes: 6200, watchTime: "2,100 h", retention: "45.8%", duration: "2:15", date: "Hace 8 días" }
    ];
    for (const item of topContent) {
      await ctx.db.insert("topContent", item);
    }

    return "Database seeded successfully";
  },
});
