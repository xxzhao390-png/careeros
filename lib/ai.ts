import { env } from "cloudflare:workers";
import type { AuthenticatedUser } from "./server-auth";

export type AiFeature = "jd_structure" | "note_organize";

type ModelResponse = { choices?: Array<{ message?: { content?: string } }> };

function cleanString(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanList(value: unknown, limit = 12) {
  return Array.isArray(value) ? value.map((item) => cleanString(item, 80)).filter(Boolean).slice(0, limit) : [];
}

export function validateJd(value: unknown) {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    title: cleanString(item.title, 120) || "待确认岗位",
    company: cleanString(item.company, 120) || "待确认公司",
    location: cleanString(item.location, 80),
    salary: cleanString(item.salary, 80),
    education: cleanString(item.education, 80),
    experience: cleanString(item.experience, 80),
    responsibilities: cleanList(item.responsibilities),
    requirements: cleanList(item.requirements),
    bonusPoints: cleanList(item.bonusPoints),
    keywords: cleanList(item.keywords, 16),
    preparation: cleanList(item.preparation, 10),
  };
}

export function validateNote(value: unknown) {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    title: cleanString(item.title, 120) || "无标题记录",
    summary: cleanString(item.summary, 600),
    type: ["quick", "meeting", "course", "inspiration"].includes(String(item.type)) ? String(item.type) : "quick",
    tags: cleanList(item.tags, 8),
    keyPoints: cleanList(item.keyPoints, 10),
    actionItems: cleanList(item.actionItems, 10),
  };
}

async function inputHash(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function runAi(user: AuthenticatedUser, feature: AiFeature, input: string) {
  const apiKey = env.AI_API_KEY;
  const baseUrl = (env.AI_BASE_URL || "").replace(/\/$/, "");
  const model = env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  if (!apiKey || !baseUrl) throw Object.assign(new Error("AI 服务尚未配置，请先添加模型凭证"), { code: "AI_NOT_CONFIGURED" });
  const today = new Date().toISOString().slice(0, 10);
  const usage = await env.DB.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE user_id = ? AND status = 'succeeded' AND created_at >= ?")
    .bind(user.id, `${today}T00:00:00.000Z`).first<{ count: number }>();
  if ((usage?.count ?? 0) >= 20) throw Object.assign(new Error("今天的 AI 整理次数已用完，明天再试"), { code: "AI_DAILY_LIMIT" });

  const schemas = feature === "jd_structure"
    ? "返回 JSON：title, company, location, salary, education, experience, responsibilities[], requirements[], bonusPoints[], keywords[], preparation[]。"
    : "返回 JSON：title, summary, type(quick/meeting/course/inspiration), tags[], keyPoints[], actionItems[]。";
  const instruction = feature === "jd_structure"
    ? "你是求职信息整理助手，只提取原文中有依据的信息，不确定内容留空。"
    : "你是个人笔记整理助手，保留原意，提取摘要、重点、标签和可执行事项，不虚构事实。";
  const started = Date.now();
  const runId = crypto.randomUUID();
  const hash = await inputHash(input);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: `${instruction}${schemas}只返回 JSON。` }, { role: "user", content: input }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Object.assign(new Error("模型暂时不可用，请稍后重试"), { code: "AI_PROVIDER_ERROR" });
    const body = await response.json() as ModelResponse;
    const raw = body.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    const result = feature === "jd_structure" ? validateJd(parsed) : validateNote(parsed);
    await env.DB.prepare("INSERT INTO ai_runs (id, user_id, feature, model, status, input_hash, result, error_code, duration_ms, created_at) VALUES (?, ?, ?, ?, 'succeeded', ?, ?, NULL, ?, ?)")
      .bind(runId, user.id, feature, model, hash, JSON.stringify(result), String(Date.now() - started), new Date().toISOString()).run();
    return result;
  } catch (cause) {
    const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "AI_INVALID_RESPONSE";
    await env.DB.prepare("INSERT INTO ai_runs (id, user_id, feature, model, status, input_hash, result, error_code, duration_ms, created_at) VALUES (?, ?, ?, ?, 'failed', ?, NULL, ?, ?, ?)")
      .bind(runId, user.id, feature, model, hash, code, String(Date.now() - started), new Date().toISOString()).run();
    throw Object.assign(cause instanceof Error ? cause : new Error("AI 整理失败"), { code });
  }
}
