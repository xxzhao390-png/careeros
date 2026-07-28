import { env } from "cloudflare:workers";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const object = await env.FILES.get(key);
  if (!object) return new Response("文件不存在", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(object.customMetadata?.originalName || key)}`);
  return new Response(object.body, { headers });
}
