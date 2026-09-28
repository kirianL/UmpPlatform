import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Falta NEXT_PUBLIC_CONVEX_URL");
  }
  return new ConvexHttpClient(url);
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      ...corsHeaders,
    },
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function listPublishedNews() {
  return await getClient().query(api.news.listPublished);
}

export async function getPublishedNewsBySlug(slug: string) {
  return await getClient().query(api.news.getPublishedBySlug, { slug });
}
