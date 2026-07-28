import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择文件" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "文件不能超过 15MB" }, { status: 400 });
  const key = `${crypto.randomUUID()}-${file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-")}`;
  await env.FILES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { originalName: file.name },
  });
  return Response.json({ key, name: file.name, size: file.size, type: file.type }, { status: 201 });
}
