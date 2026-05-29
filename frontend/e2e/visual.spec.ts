import { expect, test } from "@playwright/test";

const SNAPSHOTS = [
  { path: "/login", name: "login" },
  { path: "/inbox", name: "inbox" },
  { path: "/pricing", name: "pricing" },
];

for (const snapshot of SNAPSHOTS) {
  test(`visual snapshot - ${snapshot.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(snapshot.path);
    await expect(page).toHaveScreenshot(`${snapshot.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 });
  });
}
