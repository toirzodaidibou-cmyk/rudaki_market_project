import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// Backend баъд аз тағйирот дар админ инро даъват мекунад, то сайт фавран нав шавад.
// Танҳо бо калиди махфӣ (REVALIDATE_SECRET) ва танҳо барои тегҳои маълум.
const ALLOWED_TAGS = new Set(["products", "categories"]);

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED_TAGS.has(t))
    : [];

  // expire: 0 — дархости навбатӣ ҳатман маълумоти навро мегирад (на кӯҳнаро)
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: tags });
}
