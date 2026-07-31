import { env } from "cloudflare:workers";
import { type ItemKind, type WorkspaceItem } from "../../../lib/workspace";
import { authenticate, ensureMvpSchema, isAuthError } from "../../../lib/server-auth";

async function ensureSchema() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS workspace_items (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await ensureMvpSchema();
}

function mapRow(row: Record<string, unknown>): WorkspaceItem {
  return { id: String(row.id), kind: String(row.kind) as ItemKind, title: String(row.title), data: JSON.parse(String(row.data || "{}")) as Record<string, unknown>, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

export async function GET(request: Request) {
  await ensureSchema();
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const result = kind
    ? await env.DB.prepare("SELECT * FROM workspace_items WHERE user_id = ? AND kind = ? ORDER BY updated_at DESC").bind(user.id, kind).all<Record<string, unknown>>()
    : await env.DB.prepare("SELECT * FROM workspace_items WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Record<string, unknown>>();
  let items = result.results.map(mapRow);
  if (query) items = items.filter((item) => `${item.title} ${JSON.stringify(item.data)}`.toLowerCase().includes(query));
  return Response.json({ items });
}

export async function POST(request: Request) {
  await ensureSchema();
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const payload = await request.json() as Partial<WorkspaceItem>;
  const title = payload.title?.trim();
  if (!title || !payload.kind) return Response.json({ error: "标题和类型不能为空", code: "VALIDATION_ERROR" }, { status: 400 });
  const now = new Date().toISOString();
  const item: WorkspaceItem = { id: payload.id || `${payload.kind}-${crypto.randomUUID()}`, kind: payload.kind, title, data: payload.data || {}, createdAt: payload.createdAt || now, updatedAt: now };
  await env.DB.prepare("INSERT INTO workspace_items (id, user_id, kind, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(item.id, user.id, item.kind, item.title, JSON.stringify(item.data), item.createdAt, item.updatedAt).run();
  return Response.json({ item }, { status: 201 });
}
