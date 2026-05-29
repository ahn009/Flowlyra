import { expect, test } from "@playwright/test";

const PUBLIC_PATHS = ["/", "/features", "/pricing", "/contact", "/privacy", "/terms"];

for (const path of PUBLIC_PATHS) {
  test(`public page loads with 200: ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status(), `${path} response status`).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
}

test("pricing page shows four plan cards", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText(/starter/i).first()).toBeVisible();
  await expect(page.getByText(/team/i).first()).toBeVisible();
  await expect(page.getByText(/business/i).first()).toBeVisible();
  await expect(page.getByText(/enterprise/i).first()).toBeVisible();
  const ctaCount = await page.getByRole("button", { name: /start|upgrade|contact|choose|get started/i }).count();
  expect(ctaCount).toBeGreaterThan(0);
});

test("signup form renders required account fields", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel(/name|full name/i).or(page.getByPlaceholder(/name|full name/i)).first()).toBeVisible();
  await expect(page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first()).toBeVisible();
  await expect(page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first()).toBeVisible();
  await expect(page.getByLabel(/organization|company|workspace/i).or(page.getByPlaceholder(/organization|company|workspace/i)).first()).toBeVisible();
});
