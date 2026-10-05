import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      ...corsHeaders,
    },
  });
}

const http = httpRouter();

http.route({
  path: "/public/news",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const articles = await ctx.runQuery(api.news.listPublished);
    return json(articles);
  }),
});

http.route({
  path: "/public/news",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  pathPrefix: "/public/news/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = decodeURIComponent(
      url.pathname.replace(/^\/public\/news\//, "").replace(/\/$/, ""),
    );
    if (!slug) {
      return json({ error: "Falta el slug de la noticia." }, 400);
    }
    const article = await ctx.runQuery(api.news.getPublishedBySlug, { slug });
    if (!article) {
      return json({ error: "Noticia no encontrada." }, 404);
    }
    return json(article);
  }),
});

http.route({
  pathPrefix: "/public/news/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/public/portfolio",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const projects = await ctx.runQuery(api.portfolio.listPublished);
    return json(projects);
  }),
});

http.route({
  path: "/public/portfolio",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  pathPrefix: "/public/portfolio/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = decodeURIComponent(
      url.pathname.replace(/^\/public\/portfolio\//, "").replace(/\/$/, ""),
    );
    if (!slug) {
      return json({ error: "Falta el slug del proyecto." }, 400);
    }
    const project = await ctx.runQuery(api.portfolio.getPublishedBySlug, {
      slug,
    });
    if (!project) {
      return json({ error: "Proyecto no encontrado." }, 404);
    }
    return json(project);
  }),
});

http.route({
  pathPrefix: "/public/portfolio/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

export default http;
