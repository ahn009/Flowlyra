# QA Automation Pack (Phase 15.1 / 15.22 / 15.23)

## Accessibility Audit
- Tooling: Playwright + axe-core.
- Command:
  - `cd frontend && npm run a11y:audit`
- Coverage:
  - `/`, `/features`, `/pricing`, `/status`, `/blog`, `/help`, `/login`

## Full E2E Suite
- Command:
  - `cd frontend && npm run e2e`
- Includes:
  - public smoke tests
  - authenticated dashboard flow (env-driven)
  - browser matrix via Playwright projects

## Visual Regression
- Command:
  - `cd frontend && npm run visual:test`
- Snapshot targets:
  - homepage + status page across desktop/tablet/mobile.

## Mobile Browser QA
- Command:
  - `cd frontend && npm run e2e:mobile`
- Projects:
  - Mobile Chrome (Pixel 7 emulation)
  - Mobile Safari (iPhone 14 emulation)
