import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { LayoutBuilderValue } from "../../src/types";

async function value(page: Page): Promise<LayoutBuilderValue> {
  return JSON.parse((await page.getByTestId("value").textContent())!);
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("empty mount stays clean; add and remove the last row", async ({ page }) => {
  await page.goto("/test/browser/");
  await expect(page.getByText("No layouts yet")).toBeVisible();
  await expect(page.getByTestId("changes")).toHaveText("0");
  await expect(page.getByTestId("value")).toHaveText("[]");
  await page.screenshot({ path: test.info().outputPath("empty.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Add Layout", exact: true }).click();
  expect((await value(page))[0].columns.map((column) => column.span)).toEqual([
    "1/1",
    "1/2",
    "1/3",
  ]);
  await page.getByRole("button", { name: "Remove layout", exact: true }).click();
  await expect(page.getByText("No layouts yet")).toBeVisible();
  await expect(page.getByTestId("value")).toHaveText("[]");
});

test("populated fractional grid wraps with real nested blocks", async ({ page }) => {
  await page.goto("/test/browser/?populated");
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue(
    "Welcome to Bento",
  );
  await expect(page.getByTestId("changes")).toHaveText("0");
  const columns = page.locator("#field-layouts > section > div > section");
  await expect(columns).toHaveCount(3);
  const boxes = await columns.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height);
  expect(boxes[2].y).toBe(boxes[1].y);
  expect(boxes[1].width).toBeGreaterThan(boxes[2].width * 1.9);
  expect(boxes[1].width + boxes[2].width + 12).toBeCloseTo(boxes[0].width, 0);
  await page.screenshot({ path: test.info().outputPath("populated.png"), animations: "disabled" });
});

test("pattern edits preserve content by position and invalid drafts fall back", async ({
  page,
}) => {
  await page.goto("/test/browser/?populated");
  const pattern = page.getByRole("textbox", { name: "Layout", exact: true });
  await pattern.fill("not a fraction");
  await pattern.blur();
  await expect(pattern).toHaveValue("1/1, 2/3, 1/3");
  await pattern.fill("1/2, 1/2");
  await pattern.blur();
  const row = (await value(page))[0];
  expect(row.layout).toBe("1/2, 1/2");
  expect(row.columns.map((column) => column.id)).toEqual(["intro", "wide"]);
  expect(row.columns[0].blocks[0].props.text).toBe("Welcome to Bento");
});

test("width selection, column reorder, add and removal persist matching patterns", async ({
  page,
}) => {
  await page.goto("/test/browser/?populated");
  await page.getByRole("combobox", { name: "Column 2 width" }).click();
  await expect(page.getByRole("option", { name: "1/3", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("width-menu.png"), animations: "disabled" });
  await page.getByRole("option", { name: "1/3", exact: true }).click();
  expect((await value(page))[0].layout).toBe("1/1, 1/3, 1/3");
  await page.getByRole("button", { name: "Move column right", exact: true }).first().click();
  let row = (await value(page))[0];
  expect(row.columns.map((column) => column.id)).toEqual(["wide", "intro", "aside"]);
  expect(row.layout).toBe("1/3, 1/1, 1/3");
  expect(row.columns[1].blocks[0].props.text).toBe("Welcome to Bento");
  await page.getByRole("button", { name: "Remove column", exact: true }).first().click();
  await page.getByRole("button", { name: "Add Column", exact: true }).click();
  row = (await value(page))[0];
  expect(row.columns.slice(0, 2).map((column) => column.id)).toEqual(["intro", "aside"]);
  expect(row.layout).toBe("1/1, 1/3, 1/1");
  expect(row.columns[2].blocks).toEqual([]);
});

test("nested block edits and layout reorder keep content attached to its row", async ({ page }) => {
  await page.goto("/test/browser/?populated");
  await page.getByRole("textbox", { name: "Text", exact: true }).fill("Edited heading");
  expect((await value(page))[0].columns[0].blocks[0].props.text).toBe("Edited heading");
  await page.getByRole("button", { name: "Add Layout", exact: true }).click();
  await page.getByRole("button", { name: "Move layout down", exact: true }).click();
  expect((await value(page))[1].id).toBe("hero");
  expect((await value(page))[1].columns[0].blocks[0].props.text).toBe("Edited heading");
  await page.getByRole("button", { name: "Move layout up", exact: true }).click();
  expect((await value(page))[0].id).toBe("hero");
});

test("nested blocks can be added, hidden, shown and removed", async ({ page }) => {
  await page.goto("/test/browser/?populated");
  const column = page.locator("#field-layouts > section > div > section").nth(1);
  await column.getByRole("button", { name: "Add Block", exact: true }).click();
  await column.getByRole("textbox", { name: "Text", exact: true }).fill("Sidebar heading");
  expect((await value(page))[0].columns[1].blocks[0].props.text).toBe("Sidebar heading");
  await column.getByRole("button", { name: "Hide block", exact: true }).click();
  expect((await value(page))[0].columns[1].blocks[0].hidden).toBe(true);
  await column.getByRole("button", { name: "Show block", exact: true }).click();
  expect((await value(page))[0].columns[1].blocks[0].hidden).not.toBe(true);
  await column.getByRole("button", { name: "Remove block", exact: true }).click();
  expect((await value(page))[0].columns[1].blocks).toEqual([]);
  expect((await value(page))[0].columns[0].blocks[0].props.text).toBe("Welcome to Bento");
});

test("locale cookie updates labels on focus without dirtying the field", async ({
  page,
  context,
}) => {
  await page.goto("/test/browser/");
  await expect(page.getByRole("button", { name: "Add Layout", exact: true })).toBeVisible();
  await context.addCookies([{ name: "emdash-locale", value: "de", url: "http://127.0.0.1:4173" }]);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: "Layout hinzufügen" })).toBeVisible();
  await expect(page.getByText("Zeilen und Blöcke gestalten.")).toBeVisible();
  await expect(page.getByTestId("changes")).toHaveText("0");
  await page.setViewportSize({ width: 390, height: 700 });
  await page.screenshot({
    path: test.info().outputPath("empty-narrow-localized.png"),
    animations: "disabled",
  });
});
