// =============================================================================
// UMP Platform — Mock Data & Types
// Productora audiovisual: personal, finanzas, clientes, inventario, calendario
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Employee = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  salary: number;
  status: "active" | "inactive";
  episodeCount: number; // capítulos en los que ha participado
  avatarInitials: string;
};

export type Transaction = {
  id: string;
  concept: string;
  amount: number;
  date: string; // ISO
  category: string;
  type: "income" | "expense";
  status: "paid" | "pending" | "cancelled";
};

export type Client = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  lastInteraction: string; // ISO
  projectCount: number;
};

export type EquipmentCategory =
  | "camera"
  | "lens"
  | "audio"
  | "lighting"
  | "grip"
  | "storage"
  | "accessory";

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  camera: "Cámara",
  lens: "Lentes / Óptica",
  audio: "Audio",
  lighting: "Iluminación",
  grip: "Grip / Soporte",
  storage: "Almacenamiento",
  accessory: "Accesorios",
};

export type EquipmentStatus = "available" | "in-use" | "maintenance";

export type Equipment = {
  id: string;
  name: string;
  serialNumber: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  location: string;
  acquisitionDate: string; // ISO
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // ISO (YYYY-MM-DD)
  time: string; // HH:mm
  type: "shooting" | "pre-production" | "post-production" | "meeting" | "delivery";
  description: string;
  status: "upcoming" | "completed" | "cancelled";
};

export const EVENT_TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  shooting: "Rodaje",
  "pre-production": "Pre-producción",
  "post-production": "Post-producción",
  meeting: "Reunión",
  delivery: "Entrega",
};

// CRM

export type DealStage =
  | "lead"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "lead",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export type DealPriority = "low" | "medium" | "high";

export type Deal = {
  id: string;
  title: string;
  client: string;
  value: number;
  stage: DealStage;
  priority: DealPriority;
  createdAt: string; // ISO
  expectedClose: string; // ISO
  description: string;
  contactEmail: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _id = 100;
function id(): string {
  return String(++_id);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Mock Employees
// ---------------------------------------------------------------------------

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: id(),
    name: "Carlos Mendoza",
    role: "Director",
    phone: "+52 55 1234 5678",
    email: "carlos@ump.com",
    salary: 45000,
    status: "active",
    episodeCount: 24,
    avatarInitials: initials("Carlos Mendoza"),
  },
  {
    id: id(),
    name: "Ana Ríos",
    role: "Productora Ejecutiva",
    phone: "+52 55 2345 6789",
    email: "ana@ump.com",
    salary: 40000,
    status: "active",
    episodeCount: 30,
    avatarInitials: initials("Ana Ríos"),
  },
  {
    id: id(),
    name: "Luis Herrera",
    role: "Director de Fotografía",
    phone: "+52 55 3456 7890",
    email: "luis@ump.com",
    salary: 38000,
    status: "active",
    episodeCount: 18,
    avatarInitials: initials("Luis Herrera"),
  },
  {
    id: id(),
    name: "María Torres",
    role: "Editora",
    phone: "+52 55 4567 8901",
    email: "maria@ump.com",
    salary: 32000,
    status: "active",
    episodeCount: 26,
    avatarInitials: initials("María Torres"),
  },
  {
    id: id(),
    name: "Roberto Vega",
    role: "Sonidista",
    phone: "+52 55 5678 9012",
    email: "roberto@ump.com",
    salary: 28000,
    status: "active",
    episodeCount: 22,
    avatarInitials: initials("Roberto Vega"),
  },
  {
    id: id(),
    name: "Sofía Luna",
    role: "Gaffer",
    phone: "+52 55 6789 0123",
    email: "sofia@ump.com",
    salary: 26000,
    status: "inactive",
    episodeCount: 12,
    avatarInitials: initials("Sofía Luna"),
  },
  {
    id: id(),
    name: "Diego Paredes",
    role: "Camarógrafo",
    phone: "+52 55 7890 1234",
    email: "diego@ump.com",
    salary: 30000,
    status: "active",
    episodeCount: 20,
    avatarInitials: initials("Diego Paredes"),
  },
];

// ---------------------------------------------------------------------------
// Mock Transactions
// ---------------------------------------------------------------------------

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: id(),
    concept: "Pago Serie 'Horizontes' — Ep. 1-4",
    amount: 180000,
    date: "2026-06-20",
    category: "Producción",
    type: "income",
    status: "paid",
  },
  {
    id: id(),
    concept: "Renta de locación — Bodega Sur",
    amount: 15000,
    date: "2026-06-18",
    category: "Locaciones",
    type: "expense",
    status: "paid",
  },
  {
    id: id(),
    concept: "Nómina quincenal — Junio 1ra",
    amount: 120000,
    date: "2026-06-15",
    category: "Nómina",
    type: "expense",
    status: "paid",
  },
  {
    id: id(),
    concept: "Comercial — Marca Lumina",
    amount: 95000,
    date: "2026-06-12",
    category: "Comercial",
    type: "income",
    status: "pending",
  },
  {
    id: id(),
    concept: "Reparación Lente Canon 70-200mm",
    amount: 8500,
    date: "2026-06-10",
    category: "Mantenimiento",
    type: "expense",
    status: "paid",
  },
  {
    id: id(),
    concept: "Licencia DaVinci Resolve anual",
    amount: 6200,
    date: "2026-06-05",
    category: "Software",
    type: "expense",
    status: "paid",
  },
  {
    id: id(),
    concept: "Documental 'Raíces' — Anticipo",
    amount: 60000,
    date: "2026-06-01",
    category: "Producción",
    type: "income",
    status: "paid",
  },
  {
    id: id(),
    concept: "Alquiler equipo de audio — Sennheiser",
    amount: 4500,
    date: "2026-05-28",
    category: "Alquiler",
    type: "expense",
    status: "cancelled",
  },
];

// ---------------------------------------------------------------------------
// Mock Clients
// ---------------------------------------------------------------------------

export const MOCK_CLIENTS: Client[] = [
  {
    id: id(),
    name: "Fernando Castillo",
    company: "Lumina Brands",
    phone: "+52 55 1111 2222",
    email: "fernando@lumina.mx",
    lastInteraction: "2026-06-22",
    projectCount: 3,
  },
  {
    id: id(),
    name: "Patricia Solís",
    company: "Canal 7 Media",
    phone: "+52 55 3333 4444",
    email: "patricia@canal7.tv",
    lastInteraction: "2026-06-20",
    projectCount: 5,
  },
  {
    id: id(),
    name: "Andrés Reyes",
    company: "Reyes Distribución",
    phone: "+52 55 5555 6666",
    email: "andres@reyesdist.com",
    lastInteraction: "2026-06-15",
    projectCount: 1,
  },
  {
    id: id(),
    name: "Laura Domínguez",
    company: "Streaming MX",
    phone: "+52 55 7777 8888",
    email: "laura@streamingmx.com",
    lastInteraction: "2026-06-10",
    projectCount: 2,
  },
  {
    id: id(),
    name: "Héctor Morales",
    company: "Independiente",
    phone: "+52 55 9999 0000",
    email: "hector.m@gmail.com",
    lastInteraction: "2026-05-30",
    projectCount: 1,
  },
];

// ---------------------------------------------------------------------------
// Mock Equipment
// ---------------------------------------------------------------------------

export const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: id(),
    name: "Sony FX6",
    serialNumber: "SN-FX6-001",
    category: "camera",
    status: "in-use",
    location: "Set A — Foro Principal",
    acquisitionDate: "2024-03-15",
  },
  {
    id: id(),
    name: "Canon C70",
    serialNumber: "SN-C70-002",
    category: "camera",
    status: "available",
    location: "Bodega Central",
    acquisitionDate: "2024-06-20",
  },
  {
    id: id(),
    name: "Canon RF 50mm f/1.2L",
    serialNumber: "SN-RF50-003",
    category: "lens",
    status: "in-use",
    location: "Set A — Foro Principal",
    acquisitionDate: "2024-04-10",
  },
  {
    id: id(),
    name: "Sigma 24-70mm f/2.8 Art",
    serialNumber: "SN-SIG2470-004",
    category: "lens",
    status: "available",
    location: "Bodega Central",
    acquisitionDate: "2025-01-08",
  },
  {
    id: id(),
    name: "Sennheiser MKH 416",
    serialNumber: "SN-MKH416-005",
    category: "audio",
    status: "in-use",
    location: "Set B — Exteriores",
    acquisitionDate: "2023-11-25",
  },
  {
    id: id(),
    name: "Zoom F6 Field Recorder",
    serialNumber: "SN-ZF6-006",
    category: "audio",
    status: "available",
    location: "Bodega Central",
    acquisitionDate: "2024-09-12",
  },
  {
    id: id(),
    name: "Aputure 600d Pro",
    serialNumber: "SN-AP600-007",
    category: "lighting",
    status: "in-use",
    location: "Set A — Foro Principal",
    acquisitionDate: "2025-02-18",
  },
  {
    id: id(),
    name: "Aputure Light Dome III",
    serialNumber: "SN-APLD3-008",
    category: "lighting",
    status: "maintenance",
    location: "Taller de reparación",
    acquisitionDate: "2024-07-30",
  },
  {
    id: id(),
    name: "DJI Ronin RS3 Pro",
    serialNumber: "SN-RS3P-009",
    category: "grip",
    status: "available",
    location: "Bodega Central",
    acquisitionDate: "2024-11-05",
  },
  {
    id: id(),
    name: "Samsung T7 Shield 2TB",
    serialNumber: "SN-ST7-010",
    category: "storage",
    status: "in-use",
    location: "Estación de edición",
    acquisitionDate: "2025-05-01",
  },
];

// ---------------------------------------------------------------------------
// Mock Calendar Events (current month + some variety)
// ---------------------------------------------------------------------------

function getCurrentMonthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: id(),
    title: "Rodaje Ep. 5 — Horizontes",
    date: getCurrentMonthDate(3),
    time: "07:00",
    type: "shooting",
    description: "Foro Principal, escenas 12-18. Equipo completo.",
    status: "completed",
  },
  {
    id: id(),
    title: "Revisión de guión Ep. 6",
    date: getCurrentMonthDate(5),
    time: "10:00",
    type: "pre-production",
    description: "Reunión con escritores y director.",
    status: "completed",
  },
  {
    id: id(),
    title: "Entrega comercial Lumina",
    date: getCurrentMonthDate(8),
    time: "15:00",
    type: "delivery",
    description: "Entrega final del comercial de 30s + versión extendida.",
    status: "completed",
  },
  {
    id: id(),
    title: "Color grading — Raíces Ep. 1",
    date: getCurrentMonthDate(12),
    time: "09:00",
    type: "post-production",
    description: "Sesión de colorización con DaVinci Resolve.",
    status: "completed",
  },
  {
    id: id(),
    title: "Reunión con Canal 7",
    date: getCurrentMonthDate(15),
    time: "11:00",
    type: "meeting",
    description: "Presentación de propuesta para nueva serie.",
    status: "upcoming",
  },
  {
    id: id(),
    title: "Rodaje Ep. 6 — Horizontes",
    date: getCurrentMonthDate(18),
    time: "06:30",
    type: "shooting",
    description: "Locación exterior, Parque Central. Llamado temprano.",
    status: "upcoming",
  },
  {
    id: id(),
    title: "Edición Raíces Ep. 2-3",
    date: getCurrentMonthDate(20),
    time: "09:00",
    type: "post-production",
    description: "Primer corte de episodios 2 y 3.",
    status: "upcoming",
  },
  {
    id: id(),
    title: "Casting — Proyecto Nuevo",
    date: getCurrentMonthDate(22),
    time: "14:00",
    type: "pre-production",
    description: "Audiciones para personajes secundarios.",
    status: "upcoming",
  },
  {
    id: id(),
    title: "Entrega Raíces Ep. 1",
    date: getCurrentMonthDate(28),
    time: "17:00",
    type: "delivery",
    description: "Entrega master a Streaming MX.",
    status: "upcoming",
  },
  {
    id: id(),
    title: "Rodaje Ep. 7 — Horizontes",
    date: getCurrentMonthDate(25),
    time: "07:00",
    type: "shooting",
    description: "Interior estudio, escenas nocturnas.",
    status: "upcoming",
  },
];

// ---------------------------------------------------------------------------
// Mock CRM Deals
// ---------------------------------------------------------------------------

export const MOCK_DEALS: Deal[] = [
  {
    id: id(),
    title: "Serie 'Ecos del Mar' — T1",
    client: "Streaming MX",
    value: 1200000,
    stage: "negotiation",
    priority: "high",
    createdAt: "2026-05-10",
    expectedClose: "2026-07-15",
    description: "Serie dramática de 8 episodios. Presupuesto en negociación con plataforma.",
    contactEmail: "laura@streamingmx.com",
  },
  {
    id: id(),
    title: "Comercial Navidad — Lumina",
    client: "Lumina Brands",
    value: 150000,
    stage: "proposal",
    priority: "medium",
    createdAt: "2026-06-01",
    expectedClose: "2026-07-01",
    description: "Spot de 30s + versión extendida 60s para campaña navideña.",
    contactEmail: "fernando@lumina.mx",
  },
  {
    id: id(),
    title: "Documental 'Voces Urbanas'",
    client: "Canal 7 Media",
    value: 450000,
    stage: "won",
    priority: "high",
    createdAt: "2026-04-20",
    expectedClose: "2026-06-20",
    description: "Documental de 3 episodios sobre cultura urbana. Contrato firmado.",
    contactEmail: "patricia@canal7.tv",
  },
  {
    id: id(),
    title: "Video Corporativo — Reyes Dist.",
    client: "Reyes Distribución",
    value: 85000,
    stage: "lead",
    priority: "low",
    createdAt: "2026-06-18",
    expectedClose: "2026-08-01",
    description: "Video institucional de 5 minutos. Primer contacto.",
    contactEmail: "andres@reyesdist.com",
  },
  {
    id: id(),
    title: "Videoclip — Artista Independiente",
    client: "Héctor Morales",
    value: 65000,
    stage: "proposal",
    priority: "medium",
    createdAt: "2026-06-10",
    expectedClose: "2026-07-10",
    description: "Videoclip musical con concepto narrativo. Locaciones exteriores.",
    contactEmail: "hector.m@gmail.com",
  },
  {
    id: id(),
    title: "Serie Web — Marca Deportiva",
    client: "Lumina Brands",
    value: 320000,
    stage: "lead",
    priority: "medium",
    createdAt: "2026-06-22",
    expectedClose: "2026-09-01",
    description: "Mini-serie de 6 episodios para plataforma digital de marca deportiva.",
    contactEmail: "fernando@lumina.mx",
  },
  {
    id: id(),
    title: "Campaña Digital — Canal 7",
    client: "Canal 7 Media",
    value: 180000,
    stage: "lost",
    priority: "low",
    createdAt: "2026-03-15",
    expectedClose: "2026-05-01",
    description: "Propuesta rechazada. Cliente eligió otra productora.",
    contactEmail: "patricia@canal7.tv",
  },
  {
    id: id(),
    title: "Piloto Serie 'Fronteras'",
    client: "Streaming MX",
    value: 280000,
    stage: "negotiation",
    priority: "high",
    createdAt: "2026-06-05",
    expectedClose: "2026-07-20",
    description: "Episodio piloto para greenlight de serie thriller. 45 minutos.",
    contactEmail: "laura@streamingmx.com",
  },
];
