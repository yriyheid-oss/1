# Environment — research (2026-11-13)
Engine: web (Three.js 0.187.0 + React 19 + Vite 8.3.0 + TypeScript 7.0.2) on Linux container.

## Findings
- **Runtime & Build:** Node `v22.23.2`, Vite `8.3.0`, TypeScript `7.0.2`, `tsx 4.21.0` already installed in container.
- **3D Engine:** `three@0.187.0` + `@types/three` installed cleanly via npm (`install_applet_package`).
- **Tests:** `tsx --test` runs Node's built-in `node:test` + `node:assert/strict` directly on TypeScript modules with extensionless imports in milliseconds.
- **Browser Capture & Verification:** `playwright-cli` and headless Chromium (`chromium_headless_shell-1247`) are pre-installed in `/root/.cache/ms-playwright`; capture script uses Playwright CLI / headless Chromium against `http://localhost:3000` (with `isSoftwareGl` SwiftShader guard).
- **3D Assets:** Container has no desktop Blender GUI/sudo cask install; procedural 3–12 part `THREE.Group` composite geometry + `ExtrudeGeometry`/`LatheGeometry`/`TubeGeometry` + CanvasTexture PBR maps keep zero 404s and compact bundles.

## What this changes
- Install `three` and `@types/three`.
- Configure `ENV.md` with `RUN`, `TEST` (`npx tsc --noEmit && npx tsx --test tests/smoke.test.ts`), `BUILD` (`npm run build`), `CAPTURE` (`tools/capture.mjs` writing PNGs into `.studioigor/captures/`).
- Add `?seed=`, `?gym=`, `window.__GAME__`, and `window.__metrics` hooks for deterministic verification.

## Sources
- Container inspection (`node -v`, `npx tsc -v`, `playwright-cli`) — 2026-11-13
- `.studioigor/TECH.md`, `/skills/system_skills/threejs/SKILL.md`
