import { authenticate, isAuthError } from "../../../../../lib/server-auth";
import { runAi } from "../../../../../lib/ai";

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  const payload = await request.json() as { text?: string };
  const text = payload.text?.trim() || "";
  if (text.length < 20 || text.length > 30000) return Response.json({ error: "请粘贴 20～30000 字的 JD 内容", code: "VALIDATION_ERROR" }, { status: 400 });
  try { return Response.json({ result: await runAi(user, "jd_structure", text) }); }
  catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "AI 整理失败", code: cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "AI_ERROR" }, { status: 503 }); }
}
