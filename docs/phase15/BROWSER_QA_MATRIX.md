# Browser QA Matrix (Phase 15.12 / 15.13)

## Desktop
- Chrome (latest stable): covered by Playwright `chromium` project.
- Firefox (latest stable): covered by Playwright `firefox` project.
- Safari/WebKit: covered by Playwright `webkit` project.
- Edge: validated via Chromium baseline plus manual run on Edge stable.

## Mobile
- Android Chrome: covered by Playwright `Mobile Chrome` project.
- iOS Safari: covered by Playwright `Mobile Safari` project.

## Core Flows Checked
- Public pages navigation (home/features/pricing/help/status/blog).
- Login and authenticated dashboard shell render.
- Widget embed and public chat route rendering.
- Responsive layout checks at phone/tablet/desktop widths.

## Commands
```bash
cd frontend
npm run e2e
npm run e2e:mobile
```
