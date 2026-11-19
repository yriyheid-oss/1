# Concept — Sunken Chime

<!-- Phase 1. Brief: one line per slot. A source tag on each slot:
[user] the user answered · [stated] was in the original phrase ·
[implied] follows from the reference/genre · [default] the agent decided. -->

## Pitch
Play as a stray cat navigating the drowned rooftops of a sunken clockwork city, using a resonance bell collar to wake ancient brass locks and outwit patrol spotlight drones in a bittersweet mystery.

## Slots
- **Genre:** Third-person stealth-parkour cat adventure — [stated] Stray-like + [user]
- **Reference games:** Stray (2022) — agile cat movement, contextual rooftop jumps, atmospheric exploration; Dishonored / Little Nightmares — vertical shadow stealth around searchlights — [stated] / [implied]
- **Player fantasy:** An agile, clever stray cat claiming the high brass rooftops of a drowned clockmaker city — [user]
- **30-sec loop:** Sprint catwalks → leap ledge-to-ledge → chime resonance bell to lure drones or wake brass mechanisms → slip through shadow cover — [user] / [implied]
- **5–15 min loop:** Scout a flooded district from rooftops → unlock 3 harmonic brass relays → witness a quiet clockwork memory → open the bridge to the next district — [user] / [default]
- **Session loop:** Unlock new bell harmonics and district gates; save at dry rooftop lanterns; return for the next district and hidden memories — [user] / [default]
- **Camera:** Third-person follow camera behind the cat with mouse orbit and subtle look-ahead — [default]
- **Controls:** WASD movement, Mouse camera, Space contextual jump, Shift sprint, C crouch-stealth, E chime bell, F interact/meow — [default]
- **Modes:** Single-player story adventure — [implied]
- **Story:** Bittersweet mystery — a stray cat and a fading clockmaker automaton piece together why the city flooded and how to ring the Great Spire — [user]
- **Setting and tone:** Flooded sunken clockwork city (Venice canals + oxidized brass towers + lantern reflections); melancholic yet warm — [user]
- **Progression:** Capabilities and access — new bell harmonics (lure → chime lock → gear reverse) unlock higher districts and shortcuts — [user] / [default]
- **Failure:** Caught in a patrol spotlight stun or falling into deep floodwater → instant 1.5 s respawn at the last dry rooftop lantern — [default]
- **Session:** 15–20 min per district; 30–60 min total across 3 districts — [user]
- **Scale:** Small game — 3 districts, 1 hub rooftop, ~6–8 mvp mechanics, 3–5 quiet cutscenes — [user]
- **Platforms (preliminary):** Browser 3D (WebGL) inside this web application — [user]

## Pillars
- **Verticality over ground** — the flooded canals are deadly or patrolled, so the safest and fastest routes always belong on pipes, awnings, and clockwork rafters; test: wider ground streets vs. layered multi-height rooftop paths → layered rooftop paths.
- **Sound is your tool and your risk** — the resonance bell solves puzzles and pulls drones off-route, never acts as a weapon; test: silent keycard pickup vs. audible bell-chime lure/lock → bell-chime lure/lock.
- **Shadow stealth, zero combat** — the cat outsmarts spotlight drones through timing, elevation, and cover rather than fighting; test: claw attack vs. shadow crouch + distraction → shadow crouch + distraction.
- **Quiet visual storytelling** — environmental clockwork dioramas, automaton dialogue, and wordless cat behaviors carry emotion over exposition; test: lore text dump vs. short visual cutscene + automaton barks → short visual cutscene + barks.

## Anti-pillars
- No combat, weapons, or health-bar brawling
- No open-world filler or fetch-quest bloat
- No punishing setbacks (respawn <= 2 s at nearest dry rooftop)

## What the agent decided
- Third-person follow camera with mouse orbit and look-ahead — [default]
- Keyboard + mouse control scheme (WASD, Space contextual jump, E bell, C crouch) — [default]
- Checkpoint failure rule (instant <= 2 s respawn at last dry lantern) — [default]
- Harmonic capability progression across 3 districts — [default]
