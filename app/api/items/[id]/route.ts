import { env } from "cloudflare:workers";
import type { ItemKind, WorkspaceItem } from "../../../../lib/workspace";
import { authenticate, isAuthError } from "../../../../lib/server-auth";

function mapRow(row: Record<string, unknown>): WorkspaceItem {
  return { id: String(row.id), kind: String(row.kind) as ItemKind, title: String(row.title), data: JSON.parse(String(row.data || "{}")) as Record<string, unknown>, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const { id } = await context.params;
  const existing = await env.DB.prepare("SELECT * FROM workspace_items WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!existing) return Response.json({ error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });
  const payload = await request.json() as { title?: string; data?: Record<string, unknown> };
  const current = mapRow(existing as Record<string, unknown>);
  const title = payload.title?.trim() || current.title;
  const data = payload.data ? { ...current.data, ...payload.data } : current.data;
  const updatedAt = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_items SET title = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(title, JSON.stringify(data), updatedAt, id, user.id).run();
  return Response.json({ item: { ...current, title, data, updatedAt } });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const { id } = await context.params;
  const result = await env.DB.prepare("DELETE FROM workspace_items WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  if (!result.meta.changes) return Response.json({ error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });
  return new Response(null, { status: 204 });
}
