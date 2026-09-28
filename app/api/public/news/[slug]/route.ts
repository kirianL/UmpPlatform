import {
  getPublishedNewsBySlug,
  json,
  optionsResponse,
} from "@/lib/public-news";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const article = await getPublishedNewsBySlug(slug);
    if (!article) {
      return json({ error: "Noticia no encontrada." }, 404);
    }
    return json(article);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la noticia.";
    return json({ error: message }, 500);
  }
}
