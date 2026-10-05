import {
  json,
  listPublishedPortfolio,
  optionsResponse,
} from "@/lib/public-portfolio";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const projects = await listPublishedPortfolio();
    return json(projects);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los proyectos.";
    return json({ error: message }, 500);
  }
}
