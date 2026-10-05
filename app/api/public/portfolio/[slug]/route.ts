import {
  getPublishedPortfolioBySlug,
  json,
  optionsResponse,
} from "@/lib/public-portfolio";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const project = await getPublishedPortfolioBySlug(slug);
    if (!project) {
      return json({ error: "Proyecto no encontrado." }, 404);
    }
    return json(project);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el proyecto.";
    return json({ error: message }, 500);
  }
}
