import { env } from "cloudflare:workers";
import { authenticate, isAuthError } from "../../../../lib/server-auth";

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const { key } = await context.params;
  let metadata = await env.DB.prepare("SELECT original_name FROM uploaded_files WHERE object_key = ? AND user_id = ?")
    .bind(key, user.id).first<{ original_name: string }>();
  if (!metadata) {
    const legacyOwner = await env.DB.prepare("SELECT id FROM workspace_items WHERE user_id = ? AND instr(data, ?) > 0 LIMIT 1")
      .bind(user.id, key).first<{ id: string }>();
    if (!legacyOwner) return new Response("文件不存在", { status: 404 });
    metadata = { original_name: key.replace(/^[0-9a-f-]+-/, "") };
  }
  const object = await env.FILES.get(key);
  if (!object) return new Response("文件不存在", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(metadata.original_name)}`);
  return new Response(object.body, { headers });
}
