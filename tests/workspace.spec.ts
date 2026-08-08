import { expect, test, type Page } from "@playwright/test";

const SHOTS = ".playwright/shots";

/** Fonts must be resolved before capture or the first frame measures wrong. */
async function loaded(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => document.fonts.status === "loaded");
}

/** The app opens on the case picker; most checks want the workspace. */
async function workspace(page: Page) {
  await loaded(page);
  await page.locator(".open-row").first().click();
  await expect(page.locator(".tr").first()).toBeVisible();
}

test("open screen", async ({ page }, info) => {
  await loaded(page);
  await expect(page.locator(".open-row")).toHaveCount(4);
  // A case whose image has moved must not be openable.
  await expect(page.locator(".open-row:disabled")).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-00-open.png`, fullPage: true });
});

test("workspace — process tree", async ({ page }, info) => {
  await workspace(page);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-01-pstree.png` });
});

test("workspace — network artifacts", async ({ page }, info) => {
  await workspace(page);
  await page.getByRole("tab", { name: /netscan/ }).click();
  await expect(page.locator(".tr").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-02-netscan.png` });
});

test("workspace — injected memory", async ({ page }, info) => {
  await workspace(page);
  await page.getByRole("tab", { name: /malfind/ }).click();
  await expect(page.locator(".tr").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-03-malfind.png` });
});

test("workspace — handles, mid-stream", async ({ page }, info) => {
  await workspace(page);
  await page.getByRole("tab", { name: /handles/ }).click();
  await expect(page.locator(".tab-spinner")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-04-handles-streaming.png` });
});

test("nav — unavailable plugins stay visible", async ({ page }, info) => {
  await workspace(page);
  await page.locator(".nav-input").fill("dump");
  await expect(page.locator(".nav-item:disabled")).toHaveCount(3);
  await page.locator(".nav").screenshot({ path: `${SHOTS}/${info.project.name}-05-nav-unavailable.png` });
});

test("context menu highlights a row", async ({ page }, info) => {
  await workspace(page);
  const row = page.locator(".tr", { hasText: "rundll32.exe" }).first();
  await row.click({ button: "right" });

  const menu = page.locator(".menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator(".swatch")).toHaveCount(6); // five colours plus clear
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-06-contextmenu.png` });

  await menu.locator(".swatch").nth(1).click();
  await expect(menu).toBeHidden();
  await expect(page.locator(".tr-highlighted", { hasText: "rundll32.exe" })).toHaveCount(1);

  // Marking a row is a change to the case, and the app has to say so.
  await expect(page.locator(".case-dot-dirty")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-07-highlighted.png` });
});

test("highlight survives filtering", async ({ page }) => {
  await workspace(page);
  await page.locator(".tr", { hasText: "rundll32.exe" }).first().click({ button: "right" });
  await page.locator(".menu .swatch").nth(2).click();
  await page.locator(".toolbar-filter").fill("rundll32");
  await expect(page.locator(".tr-highlighted")).toHaveCount(1);
});

test("tree collapses and expands", async ({ page }, info) => {
  await workspace(page);
  // aria-rowcount, not the DOM count: the table is virtualised, so how many .tr
  // nodes exist depends on scroll position.
  const rowCount = () => page.locator(".tbody").getAttribute("aria-rowcount");
  const before = await rowCount();

  // Exact: the per-row disclosure controls are also labelled "Collapse subtree".
  await page.getByRole("button", { name: "Collapse", exact: true }).click();
  await expect.poll(rowCount).not.toBe(before);
  expect(Number(await rowCount())).toBeLessThan(Number(before));
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-08-collapsed.png` });

  await page.getByRole("button", { name: "Expand all" }).click();
  await expect.poll(rowCount).toBe(before);

  // Connector lanes are drawn, not spelled out in box-drawing characters.
  expect(await page.locator(".tree-lane").count()).toBeGreaterThan(0);
  expect(await page.locator(".tree-elbow").count()).toBeGreaterThan(0);
});

test("inspector is resizable", async ({ page }) => {
  await workspace(page);
  const inspector = page.locator(".inspector");
  const start = (await inspector.boundingBox())!.height;

  const splitter = page.locator(".splitter");
  await splitter.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");

  const grown = (await inspector.boundingBox())!.height;
  expect(grown).toBeGreaterThan(start);

  await splitter.dblclick();
  await expect
    .poll(async () => (await inspector.boundingBox())!.height)
    .toBeLessThan(grown);
});

test("flagged-only filter narrows to findings", async ({ page }, info) => {
  await workspace(page);
  const before = await page.locator(".tr").count();
  await page.getByRole("button", { name: "Flagged only" }).click();
  await expect(page.locator(".tr")).not.toHaveCount(before);
  expect(await page.locator(".tr .verdict-clean").count(), "every visible row should carry a verdict").toBe(0);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-09-flagged.png` });
});

test("keyboard drives the table", async ({ page }) => {
  await workspace(page);
  await page.locator(".tbody").focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".tr-selected")).toContainText("System");

  // Held keys arrive faster than React re-renders; every press must still land.
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await expect(page.locator(".tr-selected")).toHaveAttribute("aria-rowindex", "6");

  await page.keyboard.press("End");
  await expect(page.locator(".tr-selected")).toContainText("beacon.exe");
});

test("no horizontal overflow at either size", async ({ page }) => {
  await workspace(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
