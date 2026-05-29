import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("authenticated dashboard navigation flow", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow");

  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email || "");
  await page.getByPlaceholder(/password/i).fill(password || "");
  await page.getByRole("button", { name: /log in|sign in|login/i }).click();

  await page.waitForURL(/\/(inbox|home|app)/);
  await page.goto("/inbox");
  await expect(page.getByText(/inbox|chats|conversations/i).first()).toBeVisible();

  await page.goto("/admin/settings");
  await expect(page.getByText(/settings|workspace|organization/i).first()).toBeVisible();

  await page.goto("/admin/billing");
  await expect(page.getByText(/billing|current plan|starter|team|business|enterprise/i).first()).toBeVisible();

  await page.getByRole("button", { name: /logout|sign out/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
});
