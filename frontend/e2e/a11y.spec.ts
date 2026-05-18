import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PATHS = ["/", "/features", "/pricing", "/status", "/blog", "/help", "/login", "/chat/test-org"];

for (const path of PATHS) {
  test(`axe audit: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `Accessibility violations on ${path}`).toEqual([]);
  });
}
