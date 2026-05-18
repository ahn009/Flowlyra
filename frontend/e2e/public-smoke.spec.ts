import { expect, test } from "@playwright/test";

test("public marketing pages load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/features");
  await expect(page.getByRole("heading", { name: /features designed/i })).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: /transparent plans/i })).toBeVisible();

  await page.goto("/status");
  await expect(page.getByRole("heading", { name: /system status/i })).toBeVisible();
});

test("auth screens load", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
});
