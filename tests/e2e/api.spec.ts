import { expect, test } from "@playwright/test";

const userA = { "x-careeros-dev-user": "e2e-user-a@careeros.test" };
const userB = { "x-careeros-dev-user": "e2e-user-b@careeros.test" };

test("API supports CRUD and isolates two users", async ({ request }) => {
  const marker = `E2E-${Date.now()}`;
  const created = await request.post("/api/items", {
    headers: userA,
    data: { kind: "task", title: marker, data: { done: false, category: "测试" } },
  });
  expect(created.status()).toBe(201);
  const item = (await created.json()).item as { id: string; title: string };
  expect(item.title).toBe(marker);

  const ownList = await request.get("/api/items", { headers: userA });
  expect(ownList.ok()).toBeTruthy();
  expect(((await ownList.json()).items as Array<{ id: string }>).some((row) => row.id === item.id)).toBeTruthy();

  const otherList = await request.get("/api/items", { headers: userB });
  expect(otherList.ok()).toBeTruthy();
  expect(((await otherList.json()).items as Array<{ id: string }>).some((row) => row.id === item.id)).toBeFalsy();

  const forbiddenUpdate = await request.patch(`/api/items/${encodeURIComponent(item.id)}`, {
    headers: userB,
    data: { title: "不应成功" },
  });
  expect(forbiddenUpdate.status()).toBe(404);

  const updated = await request.patch(`/api/items/${encodeURIComponent(item.id)}`, {
    headers: userA,
    data: { title: `${marker}-updated`, data: { done: true } },
  });
  expect(updated.ok()).toBeTruthy();
  expect((await updated.json()).item.data.done).toBe(true);

  const forbiddenDelete = await request.delete(`/api/items/${encodeURIComponent(item.id)}`, { headers: userB });
  expect(forbiddenDelete.status()).toBe(404);

  const removed = await request.delete(`/api/items/${encodeURIComponent(item.id)}`, { headers: userA });
  expect(removed.status()).toBe(204);
});

test("AI endpoints fail safely when no model is configured", async ({ request }) => {
  const response = await request.post("/api/v1/ai/notes", {
    headers: userA,
    data: { text: "这是一条用于验证未配置模型时安全降级的测试笔记。" },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).code).toBe("AI_NOT_CONFIGURED");
});
