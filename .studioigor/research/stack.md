# Stack — research (2026-11-13)
Game: Sunken Chime — 3D stealth-parkour cat adventure, Copper Dawn Mist style, Browser 3D inside this React/Vite web app.

## Findings
- **Three.js `0.187.0`** (verified via `npm view three version`, 2026-11-13) + `three/addons/postprocessing/EffectComposer.js` (`UnrealBloomPass`, `OutputPass`) or `postprocessing@6.39.6`: full WebGL2 PBR, `FogExp2`, custom Fresnel/water GLSL shaders, small core bundle (~600 KB gzipped with tree-shaking), zero external WASM boot blockers unless Rapier is added.
- **Rapier3D `@dimforge/rapier3d-compat@0.21.0`** (verified via `npm view`): deterministic rigid-body + character collider WASM (~1.2 MB), great for general physics, though contextual rooftop ledge-jumping (like *Stray*) actually feels snappier and avoids capsule snagging with a deterministic rooftop AABB/spline/ledge-graph kinematic controller + optional lightweight raycast/collision checks.
- **Babylon.js `@babylonjs/core@9.36.0`** (verified via `npm view`): full batteries-included 3D engine with built-in Havok WASM, inspector, and post-process pipeline, but significantly heavier bundle (~3–5 MB) and heavier startup time inside a React SPA.
- **Environment constraints**: Dev & preview run inside Vite 8 + React 19 on port 3000; Playwright verification uses software WebGL (SwiftShader), so keeping draw calls lean (<= 150), using `ACESFilmicToneMapping`, and capping pixel ratio (`Math.min(window.devicePixelRatio, 2)`, or `1` under SwiftShader) ensures smooth 60 fps on laptops and reliable headless capture.

## What this changes
- Exclude Godot/Unity/Unreal because the user explicitly chose "Browser 3D right in this app" (Vite + React + TypeScript).
- Recommend **Three.js (`0.187.0`) + custom kinematic rooftop-parkour controller** (or Three.js + Rapier3D if full rigid-body physics are wanted) over Babylon.js for faster load, cleaner React integration, and precise *Stray*-style contextual jump feel without capsule physics quirks.

## Sources
- npm registry (`npm view three`, `@dimforge/rapier3d-compat`, `@babylonjs/core`, `postprocessing`) — 2026-11-13
- `.studioigor/CONCEPT.md`, `.studioigor/ART_BIBLE.md`
