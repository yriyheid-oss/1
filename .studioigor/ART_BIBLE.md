# Art bible — Sunken Chime

<!-- Phase 2 (references/style.md). Brief. Changes only by the user's decision. -->

## Direction
Copper Dawn Mist — dry high rooftops glow with oxidized verdigris and warm lantern amber while flooded canals sink into cool teal dawn mist.

## What we steal from
- Venetian dawn canal architecture (`openverse-f199354c`, `openverse-91b4a6ed`): stepped stone arches emerging from teal water mist with warm interior window points.
- Antique horological movements (`openverse-c7381c32`): exposed overlapping brass gear trains, riveted copper struts, and crisp mechanical silhouettes.

## Palette
- Dominant shadow/stone: `#1D2C31` (wet slate shadows) and `#26353B` (canal masonry)
- Secondary rooftop/brass: `#3F7D70` (oxidized verdigris copper roofs) and `#8F5E46` (tarnished brass & timber beams)
- Mist & sky fill: `#9EB4AD` (cool dawn harbor mist)
- Hero (Pip): `#D98245` (warm ginger-amber fur) with `#2A1F1B` dark ear/tail tips so the cat silhouette reads against teal roofs and slate alleys
- Reserved accent — resonance & safety: `#F4A949` (bell chime ripple, harmonic locks, dry lantern checkpoints; always paired with expanding ring or chime glyph)
- Reserved accent — danger: `#FF5733` (Watch-Owl spotlight lock & scan beam; always paired with volumetric cone + pulse chevron)
- Forbidden colors: `#FF00FF` / `#00FFFF` cyberpunk neon magenta/cyan, pure `#000000` crushed shadows, and saturated `#00FF00` toxic greens.

## Lighting
- Directional dawn key light (`#FFD5A5`, low 22° elevation, soft PCF shadows) raking across high verdigris gables; cool hemisphere fill (`#6E9AA3` sky / `#162226` canal bounce).
- Exponential harbor mist (`FogExp2` in `#1A2E33`) thickening sharply below rooftop level so flooded canals feel deep and perilous while high routes stay legible.
- Selective emissive bloom (`threshold ~0.82`, tight radius) exclusively on lantern cores, Pip's collar bell, harmonic ripples, and Watch-Owl lenses.

## Form and materials
- Silhouettes: asymmetric pitched Venetian gables, slender copper chimney pipes, overhanging timber catwalks, and exposed circular gear cutouts. Every jumpable ledge has a crisp brass/copper trim catching dawn rim light.
- Materials: stylized low-roughness wet slate (`roughness 0.25–0.38` for specular puddle/lantern streaks), matte oxidized verdigris (`roughness 0.72`), brushed brass (`metalness 0.78, roughness 0.35`). No noisy photorealistic bump-maps.
- Forbidden forms: featureless grey cubes, flat-shaded untextured slabs, and thick uniform ground streets.

## Camera and composition
- Third-person follow camera (`FOV 54°`), positioned 3.8 m behind and 1.6 m above Pip with subtle velocity look-ahead and smooth spring damping around chimneys/beams.
- Composition always frames at least two height tiers: the safe/high rooftop catwalk in the upper-middle third and the misty flooded canal + sweeping Watch-Owl beams below.

## UI
- Minimalist brass-and-ink horological HUD: thin `1px` `#8F5E46/60` hairlines, translucent `#121C20/80` glass plates, `Cinzel` or `Cormorant Garamond` display titles paired with `Inter` / `JetBrains Mono` for crisp objective & keycap prompts.
- Diegetic world cues first (expanding golden sound ring, glowing jump-arc marker, Watch-Owl beam color shift amber → `#FF5733`) with zero clutter panels.

## Signature techniques
- **Dual-Temperature Elevation Split (100% dominant):** high rooftops receive warm `#FFD5A5` dawn rim light and `#F4A949` lantern bounce, while canal water and lower alleys sit in `#1D2C31`–`#3F7D70` cool teal `FogExp2`—giving instant vertical readability on every frame.
- **Wet Specular Canal & Roof Glaze:** low-roughness rooftop edges and animated canal water planes mirror warm lantern points and `#FF5733` searchlight cones.
- **Fresnel Cat Rim & Acoustic Ripple Shader:** subtle warm-teal fresnel rim separates Pip from dark shadow pockets, while bell chimes emit an expanding additive brass-gold ring across 3D surfaces.
- Requires from the stack: WebGL2 / Three.js post-processing (`EffectComposer` + selective `UnrealBloomPass` + ACESFilmic tone mapping), `FogExp2`, custom Fresnel/water shaders, and dynamic shadow-casting directional/spot lights.

## Forbidden
- Neon cyberpunk pink/cyan signage (`#FF00FF` / `#00FFFF`)
- Unlit flat grey dev-box geometry or opaque fog hiding jump targets
- Harsh daytime sun washing out lantern reflections and spotlight cones
- Floating health bars, damage numbers, or cluttered minimaps

## References
- Set: `.studioigor/refs/copper-dawn` · Board: `.studioigor/boards/style-r1`
- `steam-5ae88371.jpg` (**look-dev bar**) — take cat silhouette on narrow pipe over misty vertical facades; avoid cyberpunk neon signs.
- `openverse-f199354c.jpg` (**look-dev bar**) — take cool teal dawn canal mist with distant warm amber lights; avoid empty flat water without reflections.
- `openverse-91b4a6ed.jpg` — take wet stone arch reflections and warm interior window points.
- `openverse-c7381c32.jpg` — take layered tarnished brass clockwork gear silhouettes and riveted framing.
