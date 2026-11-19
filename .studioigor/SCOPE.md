# Scope — the contract in numbers

What "the game is done" means for this project. The scale is agreed in phase 1,
the numbers are refined in phase 8. Lines are never deleted — they are ticked or marked
`BLOCKED: <why>`. Counted by `scope.py`.

Line syntax:

    - [ ] <name>: <N> <unit> — count: <command that prints a number>

## Reference inventory
Stray (2022): ~12 chapters (compact hubs + linear rooftop runs), 5–8 hours playtime, 1 companion drone (B-12), 2 enemy types (Zurks, Sentinels), contextual jumping, 27 memory collectibles, dialogue with robot NPCs.

## Contract
- [ ] districts: 3 pcs — count: manual: after phase 4
- [ ] mvp mechanics locked: 6 pcs — count: manual: after phase 4
- [ ] cutscenes final: 3 pcs — count: grep -cE '^\| *CS[0-9]+ .*\| *final *\|' .studioigor/STORY.md || true
- [ ] automaton NPCs with dialogue: 3 pcs — count: manual: after phase 4
- [ ] memory collectibles: 6 pcs — count: manual: after phase 4
