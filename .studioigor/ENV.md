# Environment — Sunken Chime

<!-- Phase 4 (references/environment.md). Commands verified by a real run.
VERIFIED is switched only by `studio.py verify`. CAPTURE writes images to
.studioigor/captures/. -->
VERIFIED: yes

## Installed
| tool | version | why |
|---|---|---|
| Node.js | 22.23.2 | Vite / TypeScript / node:test runtime |
| Vite | 8.3.0 | Dev server and production bundler |
| TypeScript | 7.0.2 | Type checking (`tsc --noEmit`) |
| Three.js | 0.187.0 | WebGL2 3D renderer, RoomEnvironment, postprocessing |
| tsx | 4.21.0 | Fast TypeScript runner for `node:test` unit tests |
| playwright-cli | global | Headless Chromium screenshot & console verification |
| ImageMagick | 6.9.11 | Contact sheet assembly (`montage` / `convert`) |

## Agent integrations
- `playwright-cli` browser verification (Chromium headless shell `/ms-playwright`): verified via `tools/capture.sh` (`studio.py verify`) and interactive `computer-use` checks. No IDE editor MCP is applicable in browser-only Vite runtime.

## Commands
RUN: npm run dev
TEST: npx tsc --noEmit && npx --yes tsx --test tests/*.test.ts
BUILD: npm run build
CAPTURE: npm run build && bash tools/capture.sh --out .studioigor/captures/hello --query "autostart=1&seed=1"
EDITOR: none — the code is in the repository

## Pitfalls
- Headless Chromium runs SwiftShader software WebGL (`detectSoftwareGl` activates `afterDraw` loop pacing, pixelRatio=1, and skips shadows/post-processing bloom).
- `envcheck.py --engine web` expects macOS Homebrew/npm-installed `playwright`/`vitest` — replaced cleanly with preinstalled `playwright-cli` + `tsx --test` + `tsc --noEmit`.
