import { env } from "cloudflare:workers";
import { authenticate, isAuthError } from "../../../lib/server-auth";

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择文件", code: "VALIDATION_ERROR" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "文件不能超过 15MB", code: "FILE_TOO_LARGE" }, { status: 400 });
  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  const key = `${user.id}/${fileId}-${safeName}`;
  const contentType = file.type || "application/octet-stream";
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType }, customMetadata: { originalName: file.name, ownerId: user.id } });
  await env.DB.prepare("INSERT INTO uploaded_files (id, user_id, object_key, original_name, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(fileId, user.id, key, file.name, contentType, String(file.size), new Date().toISOString()).run();
  return Response.json({ key, name: file.name, size: file.size, type: file.type }, { status: 201 });
}
