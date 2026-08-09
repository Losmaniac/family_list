// Proxies Open Food Facts' search-a-licious text search server-side.
// search.openfoodfacts.org responds fine to a plain curl (verified live)
// but never sends an Access-Control-Allow-Origin header, so a direct
// browser fetch() is silently blocked by CORS — every "Potraviny" name
// search failed outright, not just intermittently like the older
// cgi/search.pl / v2/search endpoints this replaced. A same-origin route
// handler sidesteps CORS entirely: the browser only ever talks to us, and
// server-to-server requests aren't CORS-restricted.
const SEARCH_FIELDS = "code,product_name,brands,nutriscore_grade,nutriments,images";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ hits: [] });

  const params = new URLSearchParams({ q, page_size: "20", fields: SEARCH_FIELDS });
  const upstream = await fetch(`https://search.openfoodfacts.org/search?${params.toString()}`);
  if (!upstream.ok) return new Response(null, { status: upstream.status });

  const data = await upstream.json();
  return Response.json(data);
}
