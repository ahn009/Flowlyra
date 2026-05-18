import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("authenticated dashboard flow", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow");
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email || "");
  await page.getByPlaceholder(/password/i).fill(password || "");
  await page.getByRole("button", { name: /log in|sign in|login/i }).click();
  await page.waitForURL(/\/(inbox|app)/);
  await expect(page.getByText(/inbox/i).first()).toBeVisible();
});
