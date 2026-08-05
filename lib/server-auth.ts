import { env } from "cloudflare:workers";

export type AuthenticatedUser = { id: string; email: string; displayName: string };

function identityFrom(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const url = new URL(request.url);
  const anonymousCookie = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("careeros_visitor="))
    ?.slice("careeros_visitor=".length);
  const anonymousId = anonymousCookie && /^[0-9a-f-]{36}$/i.test(anonymousCookie)
    ? anonymousCookie.toLowerCase()
    : null;
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const localEmail = isLocal ? request.headers.get("x-careeros-dev-user")?.trim().toLowerCase() : null;
  const resolvedEmail = email
    || localEmail
    || (anonymousId ? `visitor-${anonymousId}@anonymous.careeros` : null)
    || (isLocal ? "local@careeros.dev" : null);
  if (!resolvedEmail) return null;
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  let displayName = resolvedEmail.split("@")[0];
  if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(encodedName); } catch { /* keep fallback */ }
  }
  return { email: resolvedEmail, displayName };
}

async function userIdFor(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  const shortHash = Array.from(new Uint8Array(digest)).slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `usr_${shortHash}`;
}

let schemaPromise: Promise<void> | null = null;

async function initializeMvpSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS workspace_items (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS uploaded_files (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, content_type TEXT NOT NULL, size TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS uploaded_files_user_idx ON uploaded_files(user_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS ai_runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, feature TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL, input_hash TEXT NOT NULL, result TEXT, error_code TEXT, duration_ms TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS ai_runs_user_created_idx ON ai_runs(user_id, created_at)"),
  ]);
  const columns = await env.DB.prepare("PRAGMA table_info(workspace_items)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "user_id")) {
    try {
      await env.DB.prepare("ALTER TABLE workspace_items ADD COLUMN user_id TEXT REFERENCES users(id)").run();
    } catch (cause) {
      // Another Worker request may have completed the same one-time migration.
      if (!(cause instanceof Error) || !cause.message.includes("duplicate column name")) throw cause;
    }
  }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_items_user_kind_idx ON workspace_items(user_id, kind)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS workspace_items_user_updated_idx ON workspace_items(user_id, updated_at)").run();
}

export function ensureMvpSchema() {
  if (!schemaPromise) {
    schemaPromise = initializeMvpSchema().catch((cause) => {
      schemaPromise = null;
      throw cause;
    });
  }
  return schemaPromise;
}

export async function authenticate(request: Request): Promise<AuthenticatedUser | Response> {
  const identity = identityFrom(request);
  if (!identity) {
    return Response.json({ error: "正在初始化匿名工作台，请刷新后重试", code: "VISITOR_ID_REQUIRED" }, { status: 401 });
  }
  await ensureMvpSchema();
  const id = await userIdFor(identity.email);
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at")
    .bind(id, identity.email, identity.displayName, now, now).run();
  // Existing private data is claimed by the first authenticated owner. Fresh public databases have no legacy rows.
  await env.DB.prepare("UPDATE workspace_items SET user_id = ? WHERE user_id IS NULL").bind(id).run();
  return { id, email: identity.email, displayName: identity.displayName };
}

export function isAuthError(value: AuthenticatedUser | Response): value is Response {
  return value instanceof Response;
}
