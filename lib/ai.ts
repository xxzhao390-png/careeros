import { env } from "cloudflare:workers";
import type { AuthenticatedUser } from "./server-auth";

export type AiFeature = "jd_structure" | "note_organize" | "knowledge_generate" | "knowledge_import";

type ModelResponse = { choices?: Array<{ message?: { content?: string } }> };

function cleanString(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanList(value: unknown, limit = 12) {
  return Array.isArray(value) ? value.map((item) => cleanString(item, 80)).filter(Boolean).slice(0, limit) : [];
}

function cleanEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return allowed.includes(String(value) as T) ? String(value) as T : fallback;
}

function cleanTaskCandidates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((candidate) => {
    const item = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
    return {
      title: cleanString(item.title, 120),
      description: cleanString(item.description, 500),
      dueAt: /^\d{4}-\d{2}-\d{2}$/.test(cleanString(item.dueAt, 10)) ? cleanString(item.dueAt, 10) : "",
      priority: cleanEnum(item.priority, ["low", "medium", "high"] as const, "medium"),
      category: cleanEnum(item.category, ["工作", "求职", "学习", "项目", "生活"] as const, "工作"),
      confidence: cleanEnum(item.confidence, ["explicit", "potential"] as const, "potential"),
      evidenceText: cleanString(item.evidenceText, 300),
    };
  }).filter((item) => item.title && item.evidenceText);
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
    taskCandidates: cleanTaskCandidates(item.taskCandidates),
  };
}

export function validateKnowledge(value: unknown) {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const concepts = Array.isArray(item.coreConcepts) ? item.coreConcepts.slice(0, 10).map((concept) => {
    const row = concept && typeof concept === "object" ? concept as Record<string, unknown> : {};
    return { name: cleanString(row.name, 80), explanation: cleanString(row.explanation, 500) };
  }).filter((row) => row.name && row.explanation) : [];
  const reviews = Array.isArray(item.reviewCards) ? item.reviewCards.slice(0, 8).map((card) => {
    const row = card && typeof card === "object" ? card as Record<string, unknown> : {};
    return { question: cleanString(row.question, 240), answer: cleanString(row.answer, 600) };
  }).filter((row) => row.question && row.answer) : [];
  return {
    title: cleanString(item.title, 120) || "待整理知识",
    oneLineDefinition: cleanString(item.oneLineDefinition, 500),
    category: cleanString(item.category, 80) || "其他",
    whyItMatters: cleanString(item.whyItMatters, 1000),
    coreConcepts: concepts,
    howItWorks: cleanList(item.howItWorks, 10),
    useCases: cleanList(item.useCases, 10),
    example: cleanString(item.example, 1500),
    advantages: cleanList(item.advantages, 8),
    limitations: cleanList(item.limitations, 8),
    commonMistakes: cleanList(item.commonMistakes, 8),
    interviewQuestions: cleanList(item.interviewQuestions, 8),
    relatedTopics: cleanList(item.relatedTopics, 10),
    reviewCards: reviews,
    tags: cleanList(item.tags, 10),
    needsVerification: cleanList(item.needsVerification, 8),
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

  const prompts: Record<AiFeature, { instruction: string; schema: string }> = {
    jd_structure: {
      instruction: "你是求职信息整理助手。只提取原文有依据的信息，不确定内容留空；准备建议可以推导，但必须具体、可执行。",
      schema: "返回 JSON：title, company, location, salary, education, experience, responsibilities[], requirements[], bonusPoints[], keywords[], preparation[]。",
    },
    note_organize: {
      instruction: "你是个人笔记整理助手。保留原意，不虚构事实。识别明确任务与潜在任务；普通想法不要强行转成任务。原文没有明确日期时 dueAt 必须为空。",
      schema: "返回 JSON：title, summary, type(quick/meeting/course/inspiration), tags[], keyPoints[], actionItems[], taskCandidates[]。taskCandidates 每项包含 title, description, dueAt(YYYY-MM-DD或空), priority(low/medium/high), category(工作/求职/学习/项目/生活), confidence(explicit/potential), evidenceText。",
    },
    knowledge_generate: {
      instruction: "你是面向初学者的技术知识整理助手。回答要全面、准确、结构清晰，解释英文术语并结合 CareerOS 或求职场景举例；不确定或可能变化的事实放入待核实项。",
      schema: "返回 JSON：title, oneLineDefinition, category, whyItMatters, coreConcepts[{name,explanation}], howItWorks[], useCases[], example, advantages[], limitations[], commonMistakes[], interviewQuestions[], relatedTopics[], reviewCards[{question,answer}], tags[], needsVerification[]。",
    },
    knowledge_import: {
      instruction: "你是知识整理助手。严格依据用户粘贴的原始资料，去除重复和噪声，整理为可复习知识卡；不要把资料中没有的信息当成事实，缺失或存疑内容放入待核实项。",
      schema: "返回 JSON：title, oneLineDefinition, category, whyItMatters, coreConcepts[{name,explanation}], howItWorks[], useCases[], example, advantages[], limitations[], commonMistakes[], interviewQuestions[], relatedTopics[], reviewCards[{question,answer}], tags[], needsVerification[]。",
    },
  };
  const prompt = prompts[feature];
  const started = Date.now();
  const runId = crypto.randomUUID();
  const hash = await inputHash(input);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: `${prompt.instruction}${prompt.schema}只返回合法 JSON，不要 Markdown。` }, { role: "user", content: input }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Object.assign(new Error("模型暂时不可用，请稍后重试"), { code: "AI_PROVIDER_ERROR" });
    const body = await response.json() as ModelResponse;
    const raw = body.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    const result = feature === "jd_structure" ? validateJd(parsed) : feature === "note_organize" ? validateNote(parsed) : validateKnowledge(parsed);
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
