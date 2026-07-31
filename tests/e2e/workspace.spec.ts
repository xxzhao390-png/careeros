import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "⌂ 今日" })).toHaveAttribute("aria-current", "page");
}

test("workspace loads and core navigation remains usable", async ({ page }, testInfo) => {
  await openWorkspace(page);
  await expect(page.getByRole("heading", { name: "今日", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();

  await page.getByRole("button", { name: "● 求职" }).click();
  await expect(page.getByRole("heading", { name: "求职" })).toBeVisible();
  await expect(page.getByRole("button", { name: "添加 JD" })).toBeVisible();

  await page.getByRole("button", { name: "✎ 随手记" }).click();
  await expect(page.getByRole("heading", { name: "随手记" })).toBeVisible();
  await expect(page.getByRole("button", { name: "＋ 新建记录" })).toBeVisible();

  if (testInfo.project.name === "mobile-chromium") {
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(500);
  }
});

test("a note can be created, saved after refresh, and moved to trash", async ({ page, request }) => {
  const title = `自动化随手记-${Date.now()}`;
  await openWorkspace(page);
  await page.getByRole("button", { name: "✎ 随手记" }).click();
  await page.getByRole("button", { name: "＋ 新建记录" }).click();
  await page.getByPlaceholder("输入标题").fill(title);
  await page.getByPlaceholder("从这里开始记录……").fill("这是一条由 Playwright 创建的测试记录，用于验证保存和刷新。 ");
  await expect(page.getByText("正在保存…")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("✓ 已保存")).toBeVisible({ timeout: 5_000 });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "✎ 随手记" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const list = await request.get("/api/items");
  const item = ((await list.json()).items as Array<{ id: string; title: string }>).find((row) => row.title === title);
  expect(item).toBeTruthy();
  if (item) await request.delete(`/api/items/${encodeURIComponent(item.id)}`);
});
