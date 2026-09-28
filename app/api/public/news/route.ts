import {
  json,
  listPublishedNews,
  optionsResponse,
} from "@/lib/public-news";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const articles = await listPublishedNews();
    return json(articles);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar las noticias.";
    return json({ error: message }, 500);
  }
}
