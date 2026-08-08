import { expect, test, type Page } from "@playwright/test";

const SHOTS = ".playwright/shots";

/** Fonts must be resolved before capture or the first frame measures wrong. */
async function ready(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await expect(page.locator(".tr").first()).toBeVisible();
}

test("workspace — process tree", async ({ page }, info) => {
  await ready(page);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-01-pstree.png` });
});

test("workspace — network artifacts", async ({ page }, info) => {
  await ready(page);
  await page.getByRole("tab", { name: /netscan/ }).click();
  await expect(page.locator(".tr").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-02-netscan.png` });
});

test("workspace — injected memory", async ({ page }, info) => {
  await ready(page);
  await page.getByRole("tab", { name: /malfind/ }).click();
  await expect(page.locator(".tr").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-03-malfind.png` });
});

test("workspace — handles, mid-stream", async ({ page }, info) => {
  await ready(page);
  await page.getByRole("tab", { name: /handles/ }).click();
  // Catch it while the generator is still yielding.
  await expect(page.locator(".tab-spinner")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-04-handles-streaming.png` });
});

test("nav — unavailable plugins stay visible", async ({ page }, info) => {
  await ready(page);
  await page.locator(".nav-input").fill("dump");
  const disabled = page.locator(".nav-item:disabled");
  await expect(disabled).toHaveCount(3);
  await page.locator(".nav").screenshot({ path: `${SHOTS}/${info.project.name}-05-nav-unavailable.png` });
});

test("ribbon and inspector detail", async ({ page }, info) => {
  await ready(page);
  await page.locator(".ribbon").screenshot({ path: `${SHOTS}/${info.project.name}-06-ribbon.png` });
  await page.locator(".inspector").screenshot({ path: `${SHOTS}/${info.project.name}-07-inspector.png` });
});

test("flagged-only filter narrows to findings", async ({ page }, info) => {
  await ready(page);
  const before = await page.locator(".tr").count();
  await page.getByRole("button", { name: "Flagged only" }).click();
  await expect(page.locator(".tr")).not.toHaveCount(before);
  const stripes = await page.locator(".tr .verdict-clean").count();
  expect(stripes, "every visible row should carry a verdict").toBe(0);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-08-flagged.png` });
});

test("keyboard drives the table", async ({ page }) => {
  await ready(page);
  const body = page.locator(".tbody");
  await body.focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".tr-selected")).toContainText("System");

  // Held keys arrive faster than React re-renders; every press must still land.
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await expect(page.locator(".tr-selected")).toHaveAttribute("aria-rowindex", "6");

  await page.keyboard.press("End");
  await expect(page.locator(".tr-selected")).toContainText("beacon.exe");
});

test("no horizontal overflow at either size", async ({ page }) => {
  await ready(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
