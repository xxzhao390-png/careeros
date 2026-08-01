import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the CareerOS application shell", async () => {
  const [layout, page, workerConfig] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title:\s*"CareerOS/);
  assert.match(page, /CareerOS/);
  assert.match(page, /PERSONAL WORKSPACE/);
  assert.match(page, /全局搜索/);
  assert.match(workerConfig, /"main"/);
  assert.doesNotMatch(page, /Your site is taking shape|Building your site/);
});

test("core actions are backed by real API routes", async () => {
  const [page, hook, itemsRoute, itemRoute, filesRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/use-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/items/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/items/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/files/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /添加 JD/);
  assert.match(page, /保存任务/);
  assert.match(page, /添加资料/);
  assert.match(page, /生成解释草稿/);
  assert.match(page, /createOnDate/);
  assert.match(page, /setFocusedItem\(item\)/);
  assert.match(hook, /fetch\("\/api\/items"/);
  assert.match(hook, /method:\s*"POST"/);
  assert.match(hook, /method:\s*"PATCH"/);
  assert.match(hook, /method:\s*"DELETE"/);
  assert.match(itemsRoute, /export async function GET/);
  assert.match(itemsRoute, /export async function POST/);
  assert.match(itemRoute, /export async function PATCH/);
  assert.match(itemRoute, /export async function DELETE/);
  assert.match(filesRoute, /env\.FILES\.put/);
});

test("layout includes responsive and accessibility safeguards", async () => {
  const [css, page] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.knowledge-grid\s*\{[^}]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.doesNotMatch(css, /width:\s*714px/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /aria-expanded=/);
});

test("server routes enforce user ownership", async () => {
  const [itemsRoute, itemRoute, fileRoute, auth] = await Promise.all([
    readFile(new URL("../app/api/items/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/items/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/files/[key]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/server-auth.ts", import.meta.url), "utf8"),
  ]);

  assert.match(itemsRoute, /WHERE user_id = \?/);
  assert.match(itemRoute, /WHERE id = \? AND user_id = \?/);
  assert.match(fileRoute, /object_key = \? AND user_id = \?/);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(auth, /schemaPromise/);
  assert.match(auth, /duplicate column name/);
  assert.doesNotMatch(itemsRoute, /payload\.userId|payload\.user_id/);
});

test("AI workflows are optional, validated, and rate limited", async () => {
  const [page, aiService, jdRoute, noteRoute, knowledgeGenerateRoute, knowledgeImportRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ai.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/ai/jd/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/ai/notes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/ai/knowledge/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/ai/knowledge/import/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /AI 整理/);
  assert.match(page, /原文保持不变/);
  assert.match(aiService, /AI_NOT_CONFIGURED/);
  assert.match(aiService, /COUNT\(\*\).*ai_runs/);
  assert.match(aiService, /validateJd/);
  assert.match(aiService, /validateNote/);
  assert.match(aiService, /validateKnowledge/);
  assert.match(aiService, /taskCandidates/);
  assert.match(jdRoute, /runAi\(user, "jd_structure"/);
  assert.match(noteRoute, /runAi\(user, "note_organize"/);
  assert.match(knowledgeGenerateRoute, /runAi\(user, "knowledge_generate"/);
  assert.match(knowledgeImportRoute, /runAi\(user, "knowledge_import"/);
  assert.match(page, /自动创建/);
  assert.match(page, /AI 一键整理/);
});
