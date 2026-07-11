# Final Passes — execution plan (design session's own work)

Written 2026-07-11. These passes are executed by the DESIGN session (the
one that writes work orders and reviews waves), NOT by wave-implementer
sessions — they are judgment work: adversarial testing, balance calls,
and editorial voice. EXPANSION_PLAN.md §"Final passes" says WHAT; this
file says WHEN and HOW.

## Sequencing against the remaining waves

```
Wave 5 (Sonnet) ──► review (std)
Wave 6 (Sonnet) ──► review (std) ──► PASS B (balance sim)
Wave 7 (Opus)   ──► review (std) ──► PASS C (editorial + ending prose)
                                 ──► PASS A (marathon + torture save)
                                 ──► PASS D/E (per decisions below)
                                 ──► PASS F (packaging, per decision)
                                 ──► final bug-tracker harvest ──► DONE
```

- B runs after Wave 6 because that's the last wave that adds combat
  content (Wave 7 adds none); tuning found there can still ship inside
  Wave 7's session window.
- A and C need the ending to exist. C absorbs Wave 7's mandatory
  ending-prose review (the implementer stops; I write/approve the final
  words with the user).

## Pass A — Marathon drive + torture save (one session)

**A1. `tests/drive-marathon.js`** — the only drive that NEVER fabricates
state. New profile → castle → all 13 mainland tasks in order → bridge →
Miscount → pier → egg/pet → Tidepool → Frostbite → Cinderforge (lens
order enforced) → Lighthouse → (Vault via the pet) → Spire → Halls (flip
music ON via the parent panel UI, not state-poking — that's part of the
test) → castle ending → NG+ prompt. Assert at every seam: the GATE was
closed before and open after (taskIndex, bridge tiles, pier gating,
murk fog, 'H' entry, spireDone, hallsDone, castle door). Reuse the
canonicalize/solveModal helpers; story difficulty; expect a LONG runtime
(run in background, ~30–60 min) — that's fine, it's run rarely: before
declaring done, and after any future content wave.

**A2. Torture save.** Reconstruct the OLDEST save shape from `E.load()`'s
migration branches (read them all; the earliest is the flat
weapon/armor pre-v4 shape) as a hand-written JSON blob; a small drive
writes it to localStorage, loads the profile, and asserts every migrated
field: gear slots, charms→charmsOn(3), amulet null, enchants {},
potionsBought 0, defeatedAt {}, spellsCelebrated matching unlocks,
music_reading false, gearState absent-but-tolerated, plus whatever Waves
5–7 add. Catches the "eight migrations interact badly" class nothing
else can.

**Exit criteria:** both drives green in the standard sweep, added to
tests/README, and kept green thereafter (they join every future
regression).

## Pass B — Balance simulation (half session, after Wave 6)

`tests/sim-balance.js` (node script, no browser): model the expected
player at each dungeon 1–21 (gear the shops/chests provide by then;
accuracy scenarios 70% / 85% / 95%; streak distribution derived from
accuracy) against `monsterStats(i)` regulars and bosses on all three
difficulties. Output a table: expected correct-answers-to-kill and
damage-taken-per-fight. FLAG: regulars <2 or >8 answers; bosses <4 or
>12; any dungeon where story-difficulty damage-taken can exceed max HP
without potion use. Second table: cumulative gold inflow (kills, chests,
bounties at expected rates) vs cumulative sinks (gear ladder, 750g bow,
amulets, Hearthmoss, potions, enchant misses) — flag where a normal
player's gold has no remaining purpose. Third: stacked-gem extreme (all
six slots Guard vs legend; all Flame vs story) — assert neither
trivializes bosses (>3 answers still required). Deliverable: the report
in this file + proposed stat edits (shipped only after user sees the
summary — balance changes affect a live player).

## Pass C — Editorial voice pass (one session, after Wave 7)

1. Write a small extraction script dumping EVERY player-facing string
   (item quips, NPC talk pools, FLAVOR pools, celebrations, board lines,
   inn dreams, help text, story beats, tutorial text) to one file with
   source locations.
2. Read all of it in one sitting against LEVEL2_SPEC's tone guide.
   Hunting: tone drift between the five authoring sessions, doubled
   jokes, joke-at-kid's-expense violations, typos, em-dash/quote
   inconsistencies, names misspelled across files, quips that leaked
   into math text.
3. Fix in place; keep a change list; full sweep after.
4. Includes the Wave 7 ending-prose review WITH THE USER — the reveal,
   the exam lines, the coronation, Callie's and the captain's epilogue
   lines. The user signs off on these words before they ship.

## Pass D — Ergonomics (needs user decisions, then ≤half session)

OPEN QUESTIONS for the user:
- **Touch support?** The game is keyboard-only. If tablets/Chromebooks
  matter, the minimum viable version is tap-a-tile-to-pathfind (BFS walk
  to tapped floor tile, bump if adjacent interactable) + the existing
  buttons — a real but bounded feature (~one implementer wave, NOT a
  final pass; would become Wave 8).
- If touch is out of scope, say so and it's dropped deliberately.

Do regardless (mine, small): number keys 1/2/3 cast spellbook slots;
verify a sound on/off toggle exists (add one next to Calm Mode if not);
eyeball `.dim`/`.quip` contrast in screenshots at 100% zoom.

## Pass E — Parent trend view (mine, small)

Add per-day, per-skill answered/correct counters (`s.history[dateStr]
[skill] = {a, c}`, pruned to ~30 days) — written in `recordAnswer`,
displayed in the parent panel as "last 7 days vs lifetime" per topic
with a tiny arrow (▲ improving / ▼ needs a look). No charts needed;
numbers and arrows. Migration: missing = {}.

## Pass F — Packaging (needs a user decision)

Options, smallest first: (1) zip the folder with a READ-ME-FIRST.txt
for grandparents' computers; (2) host at a URL (needs `git init` + a
GitHub repo + Pages — also gives us version control, which this project
should honestly have anyway); (3) PWA install-to-home-screen (requires
hosting, so it's an add-on to option 2). Recommendation: do (2) even if
only for version control; (1) costs five minutes any time.

## Pass G — The experience audit (added 2026-07-11 after the empty-island
## and stale-list bugs; parts land early, in Wave 6.5)

The playtest bug classes all share one anatomy: a LIST someone had to
remember to extend (audit dungeons, sail captions, glyph sprites) went
stale the moment a wave added content. The cure is always the same —
**derive, register, and test**; never enumerate by hand. Concretely:

**G1. Renderability test (Wave 6.5, catches bugs live today):** walk
every glyph of every map through `tileSprite` (with the right map
context) and FAIL if any glyph renders as bare ground unless whitelisted
as intentional floor. This alone would have caught the invisible
Clockwork Spire.

**G2. Registry sweep (Wave 6.5 + ongoing):** one registry per enumerable
axis, each with a completeness test — glyphs↔classification (queued),
destinations↔captions/directions (queued), skills↔parent switches
(exists), monsters↔bestiary descs (exists), coordinate constants↔map
truth (exists for gem chests; generalize: any {x,y} constant in engine
code must name its map and be validated against it).

**G3. Arrival-experience checklist (every future region, enforced in
review):** a new region ships with (a) a visible landmark sprite for its
dungeon, (b) at least one speaking character introducing it, (c) a
captain/arrival line, (d) a taskBox chain entry, (e) an arrival
screenshot the review actually opens. Mechanical completeness is not
done-ness.

**G4. Review discipline (mine):** open EVERY screenshot a drive
produces, not a sample. The empty Horologe screenshot sat unopened
through an otherwise-thorough review.

**Fun / accessible / story-based — the improvement backlog beyond bugs:**
- **Story bible** (STORY_BIBLE.md, written by the design session): every
  character's voice in two lines, every arc's emotional beat, the
  tangle-lore rules, forbidden moves (no scolding, no "it was a test").
  Implementer dialog quality varies with what's written down for them —
  Wave 7's prose depends on this existing.
- **Reactive NPCs**: after each major flag (lamp, spire, halls), the core
  cast (Callie, Percy, the captain, Miscount, Sylvia) each get one new
  rotating line acknowledging it. The world should notice the kid's
  deeds; a dozen lines buys enormous "the story sees me" feeling.
- **The kid-facing chart**: a "sea chart" item/screen showing explored
  regions filling in (the spiral quietly pre-drawn in its geometry, per
  Wave 7's reveal) — progress made visible and story-shaped.
- **Accessibility beyond Pass D**: pips/shapes not color alone for
  puzzle states (gear gates already pip-based — keep that rule);
  a font-size bump option in the parent panel; ensure every new
  interaction stays no-timer and mouse-or-keyboard reachable.
- The delight backlog (FUTURE_LEVELS §4) and post-game Tending
  (FUTURE_LEVELS §5) remain the fun reservoirs to draw from.

## The done checklist

- [ ] Waves 5, 6, 7 shipped + reviewed
- [ ] Pass B report reviewed by user; any tuning shipped
- [ ] Pass A drives green and in the standard sweep
- [ ] Pass C change list done; ending prose user-approved
- [ ] Pass D decisions made; small items shipped
- [ ] Pass E shipped
- [ ] Pass F decision made and executed
- [ ] Bug tracker harvested from the kid's machine one last time
- [ ] README final read; play-time table updated with reality
