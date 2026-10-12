import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const landingPublic = path.resolve(
  root,
  "..",
  "..",
  "LandingPageUMPmedia",
  "public",
);

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) {
    throw new Error("Falta UmpPlatform/.env.local");
  }
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

function resolvePublic(urlPath) {
  const relative = decodeURIComponent(urlPath.replace(/^\//, ""));
  return path.join(landingPublic, relative);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

const PROJECTS = [
  {
    slug: "buscando-al-dealer",
    title: "Buscando al dealer",
    subtitle: "Serie documental original sobre la escena urbana",
    category: "Producción",
    year: "2026",
    client: "Ultimate Media Productions",
    deliverables: "Serie web, dirección, montaje, color",
    excerpt: "Calles, códigos y relatos de la escena urbana en Costa Rica.",
    coverImage: "/portfolio/productions/BuscandoAlDealer/BusquedaDealer_TL.jpg",
    videoYoutubeId: "XvPBfqjhKP0",
    lead: "Una inmersión en las calles, códigos y realidades del movimiento urbano en Costa Rica.",
    story: [
      "El proyecto registra historias que pocas veces llegan a medios tradicionales. El tratamiento es documental, con un ritmo pensado para pantalla chica.",
      "Se rodó en locaciones reales del Caribe y de la ciudad, con audio directo y un etalonaje cálido que marca cada relato.",
    ],
    credits: [
      { role: "Producción", name: "Ultimate Media Productions" },
      { role: "Dirección", name: "Equipo UMP" },
      { role: "Fotografía", name: "Cámara y drones UMP" },
      { role: "Montaje", name: "Postproducción UMP" },
    ],
    gallery: [
      {
        src: "/portfolio/productions/BuscandoAlDealer/Galeria/BIGGI LOVE1.jpg.jpeg",
        alt: "Biggi Love",
      },
      {
        src: "/portfolio/productions/BuscandoAlDealer/Galeria/DEALER 1.jpg.jpeg",
        alt: "Dealer",
      },
      {
        src: "/portfolio/productions/BuscandoAlDealer/Galeria/GEMELO 1.jpg.jpeg",
        alt: "Gemelo",
      },
      {
        src: "/portfolio/productions/BuscandoAlDealer/Galeria/Kilyam.jpg.jpeg",
        alt: "Kilyam",
      },
      {
        src: "/portfolio/productions/BuscandoAlDealer/Galeria/SOLDADO.jpg.jpeg",
        alt: "Soldado",
      },
      {
        src: "/portfolio/productions/BuscandoAlDealer/Galeria/TILI.jpg.jpeg",
        alt: "Tili",
      },
    ],
  },
  {
    slug: "la-family",
    title: "La Family",
    subtitle: "Producción sobre identidad y lazos familiares",
    category: "Producción",
    year: "2026",
    client: "Ultimate Media Productions",
    deliverables: "Cortometraje, dirección, guión, postproducción",
    excerpt: "Un retrato de hermandad en el Caribe costarricense.",
    coverImage: "/portfolio/productions/LaFamily/LaFamily.jpg",
    videoYoutubeId: "ozg6sR1Qr9Y",
    lead: "Una producción sobre unión, presión y los lazos que se sostienen en el Caribe.",
    story: [
      "La Family se filmó con casting local e iluminación naturalista. El objetivo era evitar el estereotipo y quedarse con gestos concretos.",
      "La banda sonora se escribió para los puntos de quiebre, no como adorno de fondo.",
    ],
    credits: [
      { role: "Producción", name: "Ultimate Media Productions" },
      { role: "Dirección", name: "Equipo UMP" },
      { role: "Fotografía", name: "Cámara UMP" },
      { role: "Sonido", name: "Audio UMP" },
    ],
    gallery: [
      {
        src: "/portfolio/productions/LaFamily/Galeria/HERMANO MAYOR 2.jpg.jpeg",
        alt: "Hermano mayor",
      },
      {
        src: "/portfolio/productions/LaFamily/Galeria/HERMANO MENOR 1.jpg.jpeg",
        alt: "Hermano menor",
      },
      {
        src: "/portfolio/productions/LaFamily/LaFamily.jpg",
        alt: "Póster La Family",
      },
    ],
  },
  {
    slug: "sazon-colombiano",
    title: "Sazón Colombiano",
    subtitle: "Identidad visual y fotografía de marca",
    category: "Branding",
    year: "2026",
    client: "Sazón Colombiano",
    deliverables: "Marca, sistema gráfico, fotografía de producto",
    excerpt: "Identidad y fotografía para un restaurante de cocina colombiana.",
    coverImage: "/portfolio/Branding/SazonColombiano/SazonColombiano.jpeg",
    lead: "Un sistema de marca que actualiza la presencia del restaurante sin perder el origen.",
    story: [
      "El trabajo cubre menú, empaque, digital y salón. La fotografía se apoya en textura, color y luz cálida.",
    ],
    credits: [
      { role: "Branding", name: "Ultimate Media Productions" },
      { role: "Diseño", name: "Brand Studio UMP" },
      { role: "Fotografía", name: "Estudio UMP" },
    ],
    gallery: [
      {
        src: "/portfolio/Branding/SazonColombiano/image.png",
        alt: "Identidad visual",
      },
      {
        src: "/portfolio/Branding/SazonColombiano/SazonColombiano.jpeg",
        alt: "Emblema",
      },
    ],
  },
];

async function uploadFile(client, filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`No existe la imagen: ${filePath}`);
  }
  const uploadUrl = await client.mutation(api.portfolio.generateUploadUrl);
  const bytes = readFileSync(filePath);
  const type = contentType(filePath);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": type },
    body: bytes,
  });
  if (!response.ok) {
    throw new Error(`No se pudo subir ${filePath}`);
  }
  const { storageId } = await response.json();
  return storageId;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Falta NEXT_PUBLIC_CONVEX_URL");
  const client = new ConvexHttpClient(url);

  for (const project of PROJECTS) {
    const coverStorageId = await uploadFile(
      client,
      resolvePublic(project.coverImage),
    );
    const gallery = [];
    for (const item of project.gallery) {
      gallery.push({
        storageId: await uploadFile(client, resolvePublic(item.src)),
        alt: item.alt,
      });
    }
    await client.mutation(api.portfolio.upsertBySlug, {
      slug: project.slug,
      title: project.title,
      subtitle: project.subtitle,
      excerpt: project.excerpt,
      category: project.category,
      year: project.year,
      client: project.client,
      deliverables: project.deliverables,
      status: "publicado",
      coverStorageId,
      videoYoutubeId: project.videoYoutubeId,
      lead: project.lead,
      story: project.story,
      credits: project.credits,
      gallery,
    });
    console.log(`Listo: ${project.slug}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
