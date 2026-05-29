import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_PATHS = ["/login", "/pricing"];
const AUTH_PATHS = ["/inbox"];

for (const path of PUBLIC_PATHS) {
  test(`axe has no critical violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");
    expect(critical, `Critical accessibility violations on ${path}`).toEqual([]);
  });
}

for (const path of AUTH_PATHS) {
  test(`axe has no critical violations for authenticated page shell: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");
    expect(critical, `Critical accessibility violations on ${path}`).toEqual([]);
  });
}
