# Design — Sunken Chime

A living document. Changes after playtests — with a line in "Changelog".

## Mechanics
<!-- Statuses: idea → spec → gym → playtest → locked, or cut. tier: mvp — needed
for the vertical slice; full — later. Before a mechanic — research research/mech-<id>.md. -->
| id | mechanic | tier | pillar | status | scene | notes |
|---|---|---|---|---|---|---|
| M01 | Cat movement & contextual rooftop parkour | mvp | Verticality over ground | idea | — | 30-s loop; main risk: crisp 3D jump targeting + cat agility on keyboard+mouse |
| M02 | Resonance bell chime (lure & lock) | mvp | Sound is your tool and your risk | idea | — | emits visible sound wave; lures patrol drones & opens harmonic brass locks |
| M03 | Patrol spotlight drones & shadow stealth | mvp | Shadow stealth, zero combat | idea | — | crouch in shadows, vision cone sweep, alert → investigate → stun respawn |
| M04 | Interactive cat behaviors (meow, scratch, knock) | full | Quiet visual storytelling | idea | — | tactile cat fantasy & minor environmental distractions |
| M05 | Automaton dialogue & objective HUD | mvp | Quiet visual storytelling | idea | — | portraits, ticking voice blips, choice flags, HUD objective sync |
| M06 | Cutscene camera & intro timeline (CS01) | mvp | Quiet visual storytelling | idea | — | smooth camera spline, subtitles, hold-to-skip |
| M07 | Harmonic Ledge Echo (GD01) | full | Sound is your tool and your risk | idea | — | bell ripple reveals hidden ledges for 4s while alerting nearby drones |
| M08 | Clockwork Gear-Riding (GD02) | full | Verticality over ground | idea | — | chime tuning forks to reverse/pause giant waterwheels & escapement bridges |
| M09 | Resonance Purr Stealth (GD03) | full | Shadow stealth, zero combat | idea | — | crouch + hold Purr in shadow to phase-sync with spotlight pulses at half speed |

## Game designer ideas
<!-- references/gamedesigner.md. Statuses: proposed → approved → M## | rejected (why) | deferred.
Do not propose rejected ideas again. Do not implement unapproved ones. -->
| id | idea | why it's fun | cost S/M/L | point (phase) | status |
|---|---|---|---|---|---|
| GD01 | Harmonic Ledge Echo | Chime reveals hidden ledges for 4s while alerting nearby drones — navigation vs. stealth risk | S | phase 1 | approved → M07 |
| GD02 | Clockwork Gear-Riding | Chime tuning forks to reverse spinning waterwheels & escapement bridges into vertical paths | M | phase 1 | approved → M08 |
| GD03 | Resonance Purr Stealth | Hold Purr in shadow to phase-sync with spotlight pulses and slip past at half speed | S | phase 1 | approved → M09 |
| GD04 | Memory Wind-Up Keys | Wake dormant brass birds & rooftop lamps to light permanent safe catwalks and dioramas | M | phase 1 | rejected (not selected in Phase 1 hooks) |

## Content
<!-- phase 8 (references/production.md): one line per unit. Statuses: sketch → blockout → art → final. -->
| id | new | signature moment | difficulty 1–10 | axes of difference from the neighbor | story beat | status |
|---|---|---|---|---|---|---|

## Progression and meta
- ~5 min: first bell chime unlocks the Canal Slums rooftop bridge (breakthrough: sound wakes locks) · beat 2
- ~15 min: District 2 unlocks the Tuning Fork resonance (breakthrough: reverse giant clockwork wheels) · beat 4
- ~30 min: District 3 unlocks the Spire Ascent under sweeping Watch-Owls · beat 5

## Economy
- wind-up keys (optional collectibles): hidden rooftop perches → wake dormant dioramas & shortcuts, 2 per district (6 total)
- alert meter (tension resource): spotlight exposure → fills 0–100% in 1.4 s, decays in 2.5 s in shadow

## Difficulty
- philosophy: difficulty serves the story's pacing (Stray / Inside) with accessible entry and clean rooftop retries
- axes: timing (spotlight sweeps) + spatial pathing (rooftop routes) + information (sound ripple radius)
- curve: 0–5 min 2/10 rooftop traversal → 5–20 min 4/10 first drones + bell lures → 20–40 min 6/10 moving gears + cross-sweeps → 40–50 min 7/10 Spire climax
- failure: respawn <= 1.5 s at nearest dry rooftop lantern; zero lost progress

## Mechanic specs
<!-- ### M01 — Name
what · why (pillar) · controls · rules · parameters (in data files) ·
acceptance criteria · "feel" (targets) · research: research/mech-M01.md -->

## Changelog
| date | what | why |
|---|---|---|
| 2026-11-13 | Initial draft of M01–M06 and GD01–GD04 hooks | Phase 1 concept approved |
