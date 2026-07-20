# Castle Expansion Plan — "The Castle Comes Alive" (2026-07-20)

A design direction to react to, not yet a work order. Evaluates the
late-game castle-activity candidates (RPG-genre survey, 2026-07-20),
decides which earn a build, and puts the winners in priority order.
Motivation: the castle content (Gallery, furnishing, Study, the enrolled
slime, the wardrobe, the whole Workshop Wing) has been the most popular
part of the game with the kids. This plan grows the castle into the
game's renewable late-game heart — fun, funny, and still practicing math.

## What the castle is, and the rules any new activity must obey

The castle is where the game's thesis pays off: the kid stopped being the
student and became the MathMaker — teacher and ruler. Every candidate is
judged on whether it serves THAT, and on the project constitution:

- **Combat-free.** The castle has `s.monsters = []` and always will.
  New activities teach, judge, tend, craft, collect, or play — never fight.
- **No timers, ever.** No clocks, calendars-with-pressure, or loss-chasing.
- **Gentle failure.** A wrong answer produces a funny outcome or a patient
  re-ask, never a scold, never a real loss.
- **Jokes land on monsters and items, never the kid.** Comedy channels are
  field / glyph / sound / modal — never the log (kids don't read it).
- **Math is the power system, not a quiz bolted on.** The best candidates
  hide the practice inside a thing the kid already wants to do.
- **Doors gate, never decorate; every puzzle space keeps a reset.**

## The rubric

Each candidate scored on: **Math** (does it fill a gap the dungeons
under-serve? does it record to mastery, or is it fluency-only?),
**Fun/replay** (a "one more round" hook, or a one-time beat?), **Funny**
(does it extend the castle's comedy engine?), **Cost** (reuses existing
systems, or needs new engine architecture?), **Theme** (does it serve
teacher/ruler?), **Constitution** (any friction with the rules above?).

## Verdicts (all ten candidates)

| Candidate | Math | Fun | Funny | Cost | Theme | Verdict |
|---|---|---|---|---|---|---|
| **Royal Court** (petitioners bring disputes) | applied word problems / fair division / measurement — fills a REAL gap; records to mastery | renewable daily, high | highest (absurd complaints) | LOW — reuses dialog + problem machinery | highest (ruler+teacher) | **KEEP — Wave A** |
| **The Card Game "Tiny Hats"** (Triple Triad model) | comparison + mental addition, fluency; high volume | highest — the proven "one more round" hook | strong (tiny hats, courteous trash-talk) | MED-HIGH — new board/capture/opponent system | moderate (a parlor game) | **KEEP — Wave B** |
| **The Faculty** (castle populates with reformed pupils) | none (a progress display) | passive satisfaction (Suikoden's beloved castle-fills) | moderate | LOW — spawn NPCs at milestones | highest (teachers multiply, literal) | **KEEP — connective thread through all waves** |
| **Castle Kitchen** (cook/brew by measure) | fractions / ratios / scaling — hands-on fraction practice | crafting loop, feeds food economy | strong (named disasters, sous-chef) | MED — new crafting/recipe interaction | moderate | **KEEP — Wave C (paired)** |
| **Garden Plot** (plant in rows×columns, harvest the array) | multiplication as AREA/ARRAYS — the one representation dungeons skip | farming loop, moderate | talking vegetables | LOW-MED — extends the garden furnishing tile | moderate | **KEEP — Wave C (paired with Kitchen: grow → cook)** |
| **The Menagerie** (nursery for befriended kinds) | tending = weakest-first review; records to mastery | tend/collect long-tail (Chao-garden model) | strong (social life of becalmed monsters) | MED — new area + tending loop, reuses pet-growth + befriended data | strong | **KEEP — Wave D** |
| **Games Den** (dice/wheel arcade) | mental addition/estimation; probability is slightly above grade | high replay | moderate (croupiers) | LOW-MED | moderate — GAMBLING-FRAMING risk; "luck beats math" risk | **FOLD into the Parlor (Wave B) as a side table, tokens only — not standalone** |
| **Combination Vault** (safe-cracking = factoring) | factoring / multiple-solutions | one-time-ish, low replay | low-moderate | LOW | moderate — overlaps Numberling sockets & Your Own Room's "many right answers" | **DEFER — a single treat inside another room, not a pillar** |
| **Observatory** (wonder-tier number patterns) | none by rule (look-never-test) | wonder, low interaction | low (wonder is reverent, not funny) | LOW-MED (canvas render like the spiral) | strong (golden-spiral thread) | **KEEP but LOW — a quiet capstone room, polish slot** |
| **Festival / parade** | none | one-time spectacle | moderate | MED (animation-heavy) | moderate | **CUT from the core — optional celebration IF the Menagerie ships (the befriended kinds parade)** |

Design notes behind the cuts:
- **Games Den folded, not standalone:** a whole gambling parlor risks
  teaching "luck beats working it out," the opposite of the game's thesis.
  As a token side-table in the card parlor (a target-sum dice game — "reach
  20, don't go over" is pure mental addition) it's a charming extra without
  becoming its own identity. Probability proper is 7th-grade and stays out.
- **Combination Vault deferred:** its good idea (many correct factorings)
  is already expressed by Wren's Numberling sockets and Your Own Room. One
  vault as a treat is fine; a room of them would repeat a beat.
- **Festival cut from the core:** it's a reward cutscene, not an activity,
  and expensive to animate. It earns its place only as the Menagerie's
  once-ever capstone (the kinds you befriended march), never as a pillar.

## The connective thread: the Faculty (build first, thread through all waves)

Suikoden's most-loved feature is watching your empty castle fill with the
people you recruited. Numeria's version is free thematically ("teachers
multiply") and cheap technically: as the kid completes each new activity,
a **reformed monster takes up a post** and appears in the castle —
staffing the court, dealing cards, minding the kitchen, tending the
menagerie. It records nothing and gates nothing; it is the VISIBLE
cumulative reward that makes the whole expansion feel like one growing
place instead of four bolted-on rooms. Small system (spawn NPCs at
milestones, one bump-line each), woven through from Wave A onward.

## Priority-ordered roadmap

Each wave is independently shippable as a tagged release, in the project's
usual discipline (implementer agent + design review + tests + prose stop +
marathon + screenshots). The order means we can stop after any wave and
have shipped something whole. Rationale for the ordering: lead with the
lowest-cost, highest-theme, applied-math-gap filler that re-establishes
the "living castle" frame; then the highest-fun but highest-engine-risk
piece on its own; then the two paired crafting rooms; then the gentle
long-tail collection layer.

### Wave A — "The Court" (FIRST: lowest risk, best theme, fills the applied-math gap)
The throne room opens for audiences. Petitioners queue with disputes only
arithmetic settles: harvests to divide fairly (fractions), recipes scaled
in a panic (multiplication), miscounted change (money/decimals),
who-ate-how-much-pie (fair division). The kid works it and rules; a wrong
ruling just leaves the court politely baffled and re-explaining.
- **Math:** applied word problems / fair division / measurement — the
  end of the curriculum the dungeons serve least. RECORDS to mastery.
- **Funny:** the complaints ARE the comedy — a knight demanding to know who
  ate exactly ⅜ of a pie; two slimes disputing which is rounder; a
  recurring very-serious petitioner (a magistrate-ish figure).
- **Why first:** cheapest (reuses dialog + problem machinery — mostly
  authored content), re-establishes teacher/ruler as the castle's frame,
  and stands up the Faculty thread. Renewable daily like the tangles.

### Wave B — "The Parlor" (the endgame "one more round" hook)
A card parlor. Cards are the monster kinds the bestiary has met; each has
edge-numbers; play is compare-and-capture (your edge vs. the neighbor's,
sum the board). Winning well is fast comparison and addition. A losing
opponent yields their card — and their tiny hat. Token dice side-table
("reach 20, don't bust") folds in the Games Den.
- **Math:** number comparison + mental addition, high volume; a parent
  switch can raise the edge-numbers into two-digit sums. (Design decision
  at build time: record to mastery, or keep it casual-fluency like the
  Yard. Recommendation: casual — the comparison isn't a curriculum topic,
  and a casino that grades you is less fun.)
- **Funny:** every card wears a tiny hat; opponents trash-talk with total
  courtesy. The collection instinct does the rest.
- **Why second, and alone:** highest fun and replay in the whole plan, but
  also the biggest NEW engine (board state, capture rules, a deterministic
  opponent, deck UI) — it deserves its own wave and its own risk budget.

### Wave C — "The Kitchen Garden" (two math gaps in one loop)
The garden furnishing grows into a plantable grid, and a castle kitchen
opens beside it — one supply chain. Plant crops in rows × columns and
harvest the array; carry the harvest to the kitchen and combine by
measured amounts (¾ of this, doubled for two friends).
- **Math:** multiplication as AREA/ARRAYS (the representation the dungeons
  skip entirely) in the garden; fractions / ratios / scaling in the
  kitchen. Both are hands-on "math as verb." Records to mastery.
- **Funny:** talking vegetables (Numberling cousins); a monster sous-chef
  in a tiny toque; disastrous dishes gloriously named ("Regret Soup," "The
  Sandwich That Asks Questions"); the pet has strong opinions.
- **Why paired, and here:** the grow→cook loop makes two rooms feel like
  one system; output feeds the existing food/stamina economy so it DOES
  something; medium cost, no risky new architecture.

### Wave D — "The Menagerie" (the gentle long-tail collection layer)
The befriended kinds — a whole collection the game tracks but never gave a
home — move into the castle grounds. The kid tends them; tending draws
weakest-first review; they grow, collect tiny hats, and have a social life.
Optional once-ever capstone: the parade (the cut Festival, earned here).
- **Math:** weakest-first review that RECORDS to mastery — real spaced
  practice wearing a Chao-garden skin.
- **Funny:** the social life of becalmed monsters (a Bonepile and a slime
  inexplicably best friends); the pet supervising with unearned authority.
- **Why last of the four:** gentlest and most additive (a gift to the
  anxious kid — tend-don't-fight, no failure), and it pays off the
  befriended axis and the pet. Medium cost; good as the layer that keeps
  players returning after the sharper hooks.

### Polish slot — the Observatory (any time, small)
A quiet wonder room: constellations that are number patterns (a Fibonacci
spiral of stars, primes as a sieve in the floor), continuing the
golden-spiral thread. Look, never test. Not fun-or-funny by design — a
reverent counterweight — so it rides along whenever a wave has slack,
never as a headline.

## Risks & open decisions
- **Wave B is the engine risk.** The card game is the one candidate that
  needs genuinely new architecture; if it slips, Waves C/D are independent
  and can go first. Consider a spike (a throwaway prototype of capture
  rules + one opponent) before committing the wave.
- **Record-to-mastery calls:** Court/Kitchen/Garden/Menagerie should record
  (real practice); the Parlor probably should not (a graded casino is less
  fun). Confirm at build time; keep the report card honest either way.
- **Grade ceiling:** keep probability out of the dice table (7th grade);
  keep the Observatory look-never-test.
- **This plan and the Apprentice:** the previously-floated Wave 14 was the
  Apprentice (a pupil party member who attempts problems IN COMBAT). That
  is a DUNGEON-side feature, orthogonal to this castle plan. Recommendation:
  this castle roadmap takes the next slots (it builds on the most popular
  part of the game); the Apprentice stays a parallel candidate to slot
  whenever combat wants new life. The two don't compete for the same room.

## One-line summary
Build the Court first (cheap, on-theme, fills applied math), then the
Parlor (the fun hook, its own risk budget), then the Kitchen Garden
(arrays + fractions, hands-on), then the Menagerie (gentle long-tail) —
with the Faculty threading a visibly-filling castle through all of them,
and the Observatory as quiet polish. Games Den folds into the Parlor;
the Vault and Festival are treats, not pillars.
