# ⚔️ MathMaker 👑

A math-practice adventure game for 5th graders, built on the structure of the
classic 1989 Mac RPG [TaskMaker](https://en.wikipedia.org/wiki/TaskMaker).
Math is the game's power system: you fight monsters, open locked doors, and
crack treasure chests by solving problems. No timers anywhere — careful
thinking is always the winning strategy.

## How to play

**Double-click `index.html`** — it runs in any modern browser, no install or
internet needed. Each kid types their name to get their own saved adventure
(progress auto-saves in the browser).

- **Move** with the arrow keys or WASD. Bump into things to interact.
- **Visit the castle 🏰** to meet the MathMaker and receive your task.
- **Fight monsters** by walking into them: a correct answer strikes the
  monster, a wrong one lets it hit you (and shows you the right answer, so
  every miss teaches).
- **Locked doors 🚪 and chests 🎁** open with harder problems. Chests shrink
  their treasure if you miss — take your time!
- **The shop 🏪** sells weapons, armor, and potions; answer the shopkeeper's
  money question for a 10% discount.
- **The inn 🛏** fully heals you after three easy warm-up problems.
- **Correct-answer streaks 🔥** add bonus damage (3+ in a row: +2, 6+: +4).
- Press **P** to drink a potion, **R** for the report card.

## The ten tasks (5th-grade ladder)

1. Meadow Cave — addition & subtraction facts
2. Rat Cellar — multiplication & division facts
3. Old Mine — multi-digit addition & subtraction
4. Forest Ruin — multi-digit multiplication
5. River Catacombs — long division (answers like `14 r 2`)
6. Crystal Grotto — decimals: place value, comparing, add & subtract
7. Merchant's Vault — decimals: multiply, divide & money
8. Fraction Fortress — fractions: equivalence, add & subtract
9. Wizard's Tower — fractions: multiply & mixed numbers
10. Tower of Trials — mixed word problems

Later dungeons quietly mix in review of earlier topics, weighted toward
whatever the player has been missing. Difficulty within each topic adapts
(3 tiers) based on recent accuracy. Answers accept equivalent forms:
`3/4`, `6/8`, `0.75`, `1 3/4`, `$3.50`, `14 r 2` all parse.

**For parents/teachers:** the 📊 Report Card shows per-topic accuracy.

## Code layout

| File | What it does |
|---|---|
| `js/problems.js` | Problem generators (10 skills × 3 tiers), exact-rational answer checking, input parser |
| `js/mastery.js` | Per-skill accuracy tracking, adaptive tier selection, review mixing |
| `js/data.js` | Tasks, story text, monsters, equipment, reward formulas |
| `js/maps.js` | Overworld + ten dungeon maps (ASCII tile art) |
| `js/engine.js` | Movement, combat, monster AI, doors/chests, town, save/load |
| `js/ui.js` | Canvas rendering, problem modal + scratchpad, shop, report card, sounds |
| `js/main.js` | Boot + player profiles |

No dependencies, no build step — plain HTML/CSS/JS.
