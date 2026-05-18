import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test(`visual snapshot - homepage - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page).toHaveScreenshot(`home-${viewport.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 });
  });

  test(`visual snapshot - status - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/status");
    await expect(page).toHaveScreenshot(`status-${viewport.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 });
  });
}
