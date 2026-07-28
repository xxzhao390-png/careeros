import { env } from "cloudflare:workers";
import { seedItems, type ItemKind, type WorkspaceItem } from "../../../lib/workspace";

async function ensureSchema() {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS workspace_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_items_kind_idx ON workspace_items(kind)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_items_updated_idx ON workspace_items(updated_at)").run();
}

async function seedIfEmpty() {
  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM workspace_items").first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;
  const statements = seedItems.map((item) =>
    env.DB.prepare("INSERT INTO workspace_items (id, kind, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(item.id, item.kind, item.title, JSON.stringify(item.data), item.createdAt, item.updatedAt),
  );
  if (statements.length) await env.DB.batch(statements);
}

function mapRow(row: Record<string, unknown>): WorkspaceItem {
  return {
    id: String(row.id),
    kind: String(row.kind) as ItemKind,
    title: String(row.title),
    data: JSON.parse(String(row.data || "{}")) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(request: Request) {
  await ensureSchema();
  await seedIfEmpty();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const result = kind
    ? await env.DB.prepare("SELECT * FROM workspace_items WHERE kind = ? ORDER BY updated_at DESC").bind(kind).all<Record<string, unknown>>()
    : await env.DB.prepare("SELECT * FROM workspace_items ORDER BY updated_at DESC").all<Record<string, unknown>>();
  let items: WorkspaceItem[] = result.results.map((row: Record<string, unknown>) => mapRow(row));
  if (query) {
    items = items.filter((item) => `${item.title} ${JSON.stringify(item.data)}`.toLowerCase().includes(query));
  }
  return Response.json({ items });
}

export async function POST(request: Request) {
  await ensureSchema();
  const payload = await request.json() as Partial<WorkspaceItem>;
  const title = payload.title?.trim();
  if (!title || !payload.kind) return Response.json({ error: "标题和类型不能为空" }, { status: 400 });
  const now = new Date().toISOString();
  const item: WorkspaceItem = {
    id: payload.id || `${payload.kind}-${crypto.randomUUID()}`,
    kind: payload.kind,
    title,
    data: payload.data || {},
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };
  await env.DB.prepare("INSERT INTO workspace_items (id, kind, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(item.id, item.kind, item.title, JSON.stringify(item.data), item.createdAt, item.updatedAt).run();
  return Response.json({ item }, { status: 201 });
}
