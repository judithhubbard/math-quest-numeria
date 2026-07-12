# Math Quest: Numeria — Final Design Review
## Classic-RPG lessons, the educational arc, and the two kids

Written 2026-07-11, at content-complete. This is analysis first, backlog
second: §4 distills everything into a proposed Wave 8. Read with
STORY_BIBLE.md and FUTURE_LEVELS.md.

---

## 1. The two kids (read this section first — everything serves it)

**Kid A**: loves fighting, seeks challenge and scary things, advanced at
math. **Kid B**: hates failure, nervous about mistakes, loves cute and
silly things, hesitant at math.

The design insight that matters: these aren't two difficulty settings —
they're two different RELATIONSHIPS with risk. Kid A is engaged by
choosing risk; Kid B is engaged by controlling it. A game welcomes both
kids when risk is a DIAL THE KID HOLDS, not a property of the game.
Every recommendation below is some form of handing over that dial.

What the game already does right for each (worth naming so we protect it):
- For B: no timers, gentle failure, worked solutions on misses, story
  difficulty, the pet, tiny hats, an ending about mercy.
- For A: streaks/crits, legend difficulty, the Champion's Gauntlet,
  Golden Numeria, boss phase-twists, the ranged/melee choice.

What's missing: B has no way to engage with COMBAT on her terms (it's
the core loop and it's framed as violence with failure states), and A
has no way to engage with MATH above his level (the curriculum cap is a
ceiling on his favorite thing).

---

## 2. Lessons from the classics

**Dragon Quest — the visible next thing.** DQ's genius was that the next
ding is always visible and always close. AUDIT: our XP bar shows next
level ✓, taskBox shows next quest ✓ — but badges, bestiary %, and bounty
progress hide in menus. LESSON: surface "almost!" states (a badge at
47/50 correct should glow in the sidebar). Cheap, and it powers the
practice loop directly.

**Pokémon — decisions before the fight, not during.** Pokémon is a
kids' strategy game with zero reflexes: all the depth is in pre-battle
choice. Our combat has almost no decision layer — gear is set-and-forget
and the only in-battle verb is flee. LESSON (the big one): add ONE
pre-strike choice — see §3 "Brave Problems" and "telegraphs." Choice is
engagement; for kids, choice is also anxiety relief.

**Undertale — mercy is a mechanic.** You can win every fight by
sparing. This maps onto our fiction PERFECTLY — the lore already says
monsters are tangles and a worked answer UNTIES them; the Discord just
wanted into the choir; the game's climax is a mercy. We simply never
mechanized it. LESSON: the **Soothe** verb (§3) — identical math,
gentler frame. For a kid who "hates fighting," the objection is usually
the framing, not the challenge.

**EarthBound — respect the overleveled player.** When you vastly
outclass an enemy, EarthBound just... gives you the win, no scene.
LESSON: an **overwhelm rule** — a monster far below your level is
dispatched by ONE quick problem ("It takes one look at your worked
answer and unties itself on the spot"). Keeps practice density per
minute high, removes grind, feels powerful. (Bosses never overwhelm.)

**Zelda — curiosity always pays.** Secret walls + the pet's nose are
our version ✓. The audit: secrets exist only in ~9 places. LESSON: a
secrets-density pass belongs in any future content wave (one '%' or one
odd tile per floor, minimum), because curiosity is the engine that makes
a kid EXPLORE, and exploring walks them past more problems.

**The JRPG inn — rhythm and safety.** Already ours ✓ (and the inn
warm-ups are quietly the game's no-fail practice room — see §3, we
should build on exactly this).

---

## 3. The educational arc — and the concrete proposals

The arc today: procedures trained in combat (quick problems), concepts
gated at doors/chests (full-depth), review interleaved weakest-first,
mastery adaptive by tier, badges for accumulation, one embodied-math
mechanic (slab-tiling), error-analysis at the very end (the inverted
exam). That's a genuinely sound spine. The gaps, in learning-science
terms: no spacing model (rust), error analysis arrives only at the end,
tracking shows accuracy but not growth or error PATTERNS, and the
modality that's safest for anxious learners (judging someone else's
work) is locked behind finishing the game.

### The proposals (each tagged for which kid it serves)

**P1. The Soothe verb (Kid B; fiction-perfect).** In any battle, the kid
chooses STRIKE or SOOTHE — same problems, same progress, different
verbs: soothe "loosens" the tangle; the monster relaxes, sighs, wanders
off; bestiary marks it befriended 🕊 (a SECOND collection axis — Kid B
gets a collection game Kid A hasn't finished). Damage numbers become
"calm" progress on the same bar. Zero new math machinery; a reskin of
verbs, floaters, and victory text, gated per-battle so siblings sharing
a save style their own fights. The lore already believes this; the
mechanic just catches up.

**P2. Monster telegraphs (both kids).** Each monster shows a small icon
of its problem topic (➗ ✖️ 🕐 …) above its head, and dungeon rosters
say it in the bestiary. Kid B picks fights she feels ready for —
agency, the antidote to dread. Kid A hunts the topics that pay his
brave-problem bonus. One sprite overlay + one data lookup.

**P3. Brave Problems (Kid A; the ceiling-raiser).** Before any strike,
an optional "⚡ brave problem" toggle: take a problem ONE TIER (or one
grade-tier, if parent-enabled) above your current level for DOUBLE
strike damage; a miss just does normal-miss things (no extra penalty —
bravery is never punished, per the pillars). Advanced kids self-select
into harder math because it's POWER, not homework; hesitant kids never
see pressure to touch it. This single mechanic converts the game's
biggest constraint (curriculum cap) into its best challenge dial.

**P4. Miscount's Academy, brought forward (Kid B; the safest modality).**
Spot-the-error was designed for the post-game Tending and the final
exam — but judging SOMEONE ELSE'S work is precisely the psychologically
safe practice for a kid who fears her own mistakes (the error is
Miscount's, finding it is a kindness, and "it's correct!" is a live
answer). Open a small version right after Miscount's redemption (task
10): once a day, he brings 2–3 slates to check. It also deepens the
game's best character arc a full act earlier.

**P5. Rust and the review rhythm (both; spacing).** Track days-since-
practiced per topic; topics unpracticed for ~5+ days get gently boosted
weight in mixed pools and a bounty flavor ("The Old Mine misses you —
its ghosts are miscounting again"). Framed as the world needing
tending — which after Wave 7 is literally the kid's job. The spacing
model the arc lacks, in one weight tweak plus one bounty type.

**P6. Tracking that shows GROWTH, not just accuracy (both kids + parent).**
- Parent: the planned trend view (Pass E), PLUS a "recent misses" list —
  the last ~10 missed problems per topic, verbatim, with the kid's
  answer. A parent-teacher diagnoses regrouping errors from three
  examples faster than from any percentage.
- Kid-facing: a growth line in the report card, written as story:
  "When you started, long division took you three tries. This week:
  nine out of ten." For Kid B this is the counter-story to "I'm bad at
  math"; data as encouragement, never comparison.
- Hall of Heroes guardrail: it already refuses to be a leaderboard —
  strengthen that: celebrate DIFFERENT bests per kid (days tended,
  befriended monsters, hats found, titles) so both kids' plaques look
  full without inviting cross-kid comparison on any single number.

**P7. Overwhelm rule (both; pacing).** As in §2/EarthBound: monsters ≥6
levels below dispatch with one quick problem and a one-line gag. More
math per minute, less tedium, big-feeling.

**P8. Finish the delight catalog (Kid B disproportionately).** The
Wave 5 pass shipped a subset; the remainder (innkeeper's cat, pet
tricks by stage, shopkeeper's shelf, monster idle life, bestiary hat
counter) is FUTURE_LEVELS §4, already specced. For the kid who loves
cute and silly, ambient charm is not polish — it's the reason to be
there. Cosmetic collecting (the Tending's pet hats) doubly so.

---

## 4. The distilled backlog — proposed Wave 8: "The Two Kids Update"

Ordered by welcome-per-effort:
1. P2 telegraphs (small)
2. P7 overwhelm (small)
3. P1 Soothe (medium — verbs/animations/bestiary axis; no math changes)
4. P3 Brave Problems (medium — one problem-picker param + battle UI)
5. P4 Academy-early (medium — the exam machinery exists from Wave 7)
6. P5 rust weights + bounty (small)
7. P6 tracking: recent-misses + growth line + Hall guardrail (small-medium;
   fold into Pass E)
8. P8 delight completion (already specced, FUTURE_LEVELS §4)
DQ "almost!" surfacing rides along with whichever touches the sidebar.

Everything above obeys the constitution: no timers, no reflexes, no
scolding, gentle failure, math as the only power, cosmetics not power as
post-game rewards. Nothing requires new curriculum; P3's higher tiers
stay behind the parent panel where the family already decided such
things live.

## 5. What NOT to change (the negative space, hard-won)

- Don't add lives, energy systems, or any lose-progress state. The
  gentleness IS the moat — it's what lets Kid B in the door.
- Don't gamify accuracy percentages at the kid (badges already reward
  volume+recency; a visible percentage is a shame dial for Kid B).
- Don't auto-detect "which kid is which" — both mechanics-sets stay
  available to both kids at all times. Kids surprise you: the fighter
  will befriend things some days; the careful one will one day pick a
  brave problem because the dial was hers to turn. That moment is the
  whole point of the design.
