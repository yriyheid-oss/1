# Technology — Sunken Chime

<!-- Phase 3 (references/stack.md). ENGINE — one of: godot, godot-mono, unity,
unreal, web, defold, bevy (read by studio.py and envcheck.py). DIMENSION — 2D or 3D
(2.5D with 3D models is 3D); envcheck.py recommends Blender for 3D. -->
ENGINE: web
ENGINE VERSION: Three.js 0.187.0 + Vite 8.3.0
DIMENSION: 3D
LANGUAGE: TypeScript
PLATFORMS: web (AI Studio App)

## Decision
- context: 3D stealth-parkour cat adventure ("Sunken Chime") running directly inside this React/Vite Browser 3D app, needing Copper Dawn Mist fog/bloom/fresnel visuals and crisp contextual rooftop jumping.
- options: Three.js 0.187 + Custom Kinematic Parkour (fast boot, zero WASM overhead, full shader/camera/jump control); Three.js + Rapier3D (~1.2 MB WASM, rigid-body capsule risks snagging on rooftop ledges); Babylon.js + Havok (3–5 MB bundle, heavier startup).
- choice and why: Three.js 0.187.0 + Custom Kinematic Parkour — instant browser load, crisp Stray-like contextual jump arcs, direct control over FogExp2, selective bloom, water shaders, and Fresnel rim lighting.
- consequences: procedural 3D composite meshes (3–12 parts) in TypeScript; Web Audio API procedural sound synthesis; zero external 404 assets.

## Budgets
- 60 fps on laptop GPU (<= 16.6 ms/frame); software WebGL verification uses `afterDraw` pacing and capped DPR = 1.0
- <= 150 draw calls per district (InstancedMesh for repeating tiles, lanterns, gear teeth)
- Initial bundle <= 3 MB gzipped; load <= 2 s

## Project structure
- `src/core/`: fixed-step `loop.ts`, mulberry32 `rng.ts`, typed `events.ts`, `event.code` `input.ts`, versioned `save.ts`, `audio.ts`
- `src/systems/`: pure decoupled simulation modules (cat parkour, bell resonance, spotlight stealth, gear riding, dialogue)
- `src/view/`: Three.js renderer, Copper Dawn lighting/fog/PMREM rig, procedural composite meshes, shaders, VFX
- `src/ui/`: React HUD overlay (title, objective, bell/stealth cues, dialogue box, cutscene subtitles, collapsible controls)
- `src/data/`: JSON/TS tuning tables (parkour, bell, stealth)
- `src/content/`: district layouts, NPC dialogues, cutscene timelines
- `src/gyms/`: isolated playable test scenes (`?gym=parkour`, `?gym=bell`, `?gym=stealth`, etc.) with live tuning sliders
- `tests/`: `node:test` deterministic pure-logic verification (`npx tsx --test`)
