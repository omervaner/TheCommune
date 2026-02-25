# The Commune — Commune Layer Roadmap (v2)

## Philosophy

- **Nothing is hardcoded.** Every system is data-driven and parameterized from birth. Test with minimal data, not hardcoded values.
- **Build it where it lives.** Don't build in a temporary location and move later.
- **Don't define types until they're used.** Interfaces are created in the milestone that first needs them, not speculatively.
- **Every milestone produces something visible and testable.**
- **Each milestone builds on the previous one — no throwaway code, no refactors of recent work.**

## Prerequisite Fix: Parameterize CombatScene

Before starting C0, CombatScene must accept squad + enemy composition as constructor/start parameters instead of hardcoding characters. This is a 10-minute change that prevents C4 from having to refactor it later. The current hardcoded roster becomes default test data passed in from main.ts.

- [ ] CombatScene.enter() accepts `{ squad: Character[], enemies: Character[] }`
- [ ] Remove hardcoded character creation from CombatScene
- [ ] main.ts passes the test roster as data
- [ ] Verify combat still works identically

---

## C0: Commune Scene Skeleton + Dialogue Engine

**Goal:** CommuneScene exists as the game's starting screen. The dialogue engine works inside it. The dim-and-spotlight pattern is testable in its permanent home.

### Part A: Commune Scene Skeleton
- [ ] Create `src/scenes/CommuneScene.ts` — minimal Scene class
  - Solid background color
  - Title text ("The Commune")
  - Placeholder "Start Test Dialogue" button
  - Placeholder "Go To Combat" button (transitions to CombatScene with default test roster)
- [ ] Create `src/game/CommuneState.ts` — minimal state, only what C0 needs
  - Roster: Character[] (initialized with Karen, Therapist, Dave)
  - Money: number
  - Morale: number
  - No traits, no relationships, no events yet — those types are created when needed
- [ ] Update `main.ts` to start on CommuneScene
- [ ] "Go To Combat" passes CommuneState.roster + default test enemies to CombatScene

### Part B: Dialogue Engine
- [ ] Create `src/dialogue/types.ts` — DialogueScript, DialogueStep, Choice, Outcome
- [ ] Create `src/dialogue/DialogueEngine.ts` — pure data state machine
- [ ] Create `src/rendering/PortraitCard.ts` — dual-mode character card
- [ ] Create `src/rendering/DialogueRenderer.ts` — dim overlay, card slots, speech bubbles, choices
- [ ] Test dialogue triggered from CommuneScene button

**Test:** Game opens to CommuneScene. "Test Dialogue" dims the screen, cards appear, dialogue plays with choices, cards dismiss. "Go To Combat" transitions to a fight and back.

---

## C1: The Hub

**Goal:** CommuneScene becomes a real management hub. Roster display, resources, navigation.

- [ ] Roster display: row of character portrait thumbnails from CommuneState.roster (clickable)
- [ ] Resource bar at top: money + morale
- [ ] Navigation buttons: Missions, Recruit, Upgrades, Events (all placeholder except Events which triggers the test dialogue for now)
- [ ] Clicking a portrait opens their full card (stats mode via PortraitCard)
- [ ] Remove the test buttons from C0 (replaced by real navigation)
- [ ] After combat ends: transition back to CommuneScene, apply basic results (morale +10 for win, -10 for loss)

**Test:** Game opens to a real hub. See your 3 characters. See money and morale. Click a portrait to see their card. Go to combat and come back.

---

## C2: Personality Traits & Relationships

**Goal:** Characters have traits. Traits create relationships. Relationships are visible on cards. This is the data foundation that C3, C4, and C5 all depend on.

- [ ] Create `src/game/types_commune.ts` — PersonalityTrait, Relationship, TraitInteraction interfaces
  - Created now because this is the first milestone that uses them
- [ ] Create `src/data/traits.ts` — 10-15 trait definitions
  - Each trait: id, name, description, clashWith[], bondWith[]
  - Combat modifiers: initiative mod, resolve mod, damage mod (defined now, applied in C4)
- [ ] Create `src/game/RelationshipManager.ts` — pure data
  - Relationship scores between all character pairs (-100 to +100)
  - Auto-calculate on roster change based on trait compatibility
  - Threshold: below -50 = clash, above +50 = bond
  - getRelationship(a, b), modifyRelationship(a, b, delta), getClashes(char), getBonds(char)
- [ ] Add `traits: PersonalityTrait[]` to Character interface
- [ ] Assign traits to Karen, Therapist, Dave
- [ ] Update PortraitCard stats mode: show traits and relationship indicators
- [ ] CommuneState owns a RelationshipManager instance, initialized when roster is set

**Test:** Open Karen's card, see her traits. See clash/bond indicators with other characters.

---

## C3: Event System

**Goal:** Events fire between missions. Dialogue engine shows them. Player choices have real consequences.

- [ ] Create `src/game/EventManager.ts` — pure data
  - Accepts event templates from a data file (not hardcoded internally)
  - evaluateTriggers(communeState): returns events whose conditions are met
  - Trigger types: trait-pair, morale-threshold, time-based, relationship-threshold
  - **Configurable frequency modifier from the start** (defaults to 1.0, C6 upgrades modify it)
  - processOutcome(outcome, communeState): applies morale/relationship/money/trait/departure changes
- [ ] Create `src/data/events.ts` — 8-10 event definitions as data
  - Each event: trigger conditions, participant requirements, dialogue script, choices, outcomes
  - Events reference traits/relationships, not specific characters (so they work with any roster)
- [ ] Wire into CommuneScene:
  - After returning from combat, EventManager evaluates triggers
  - Pending events show as notification badge on Events button
  - Clicking Events plays the event through the dialogue engine
  - Outcomes applied to CommuneState after dialogue completes
  - CommuneScene refreshes roster/resources display after outcomes

**Test:** Win a fight. Return to commune. Event fires because two characters have clashing traits. Make a choice. See morale change. Roster display updates.

---

## C4: Mission Select, Squad Chemistry, and Combat Integration

**Goal:** Pick missions. Select your squad. Chemistry preview is honest — bonds and clashes actually affect combat.

Why combined: The chemistry preview and the combat effects are the same data. Showing "Karen and Dave: -1 initiative" in the preview but not applying it in combat is a lie. Build both together.

- [ ] Create `src/data/missions.ts` — mission templates as data
  - Each mission: id, title, description, difficulty, rewards, enemy composition (references enemy templates)
  - 3-5 missions for launch
- [ ] Create `src/data/enemies.ts` — enemy templates by faction as data
  - Corporate: Goons, Lawyers, PR Reps (different abilities, different AI behavior hints)
  - Each template is a factory function or data object, not a hardcoded character
- [ ] Create `src/rendering/MissionSelect.ts` — uses dim-and-spotlight
  - Threat card with mission description
  - Squad slots: player picks 3-4 from roster
  - Chemistry panel: reads RelationshipManager, shows bonds/clashes + their combat effects
  - Confirm → transition to CombatScene with selected squad, enemies from mission, and relationship data
- [ ] CombatScene setup: apply bond/clash modifiers at combat start
  - Read relationship data passed in
  - Adjacent bonded characters: +1 initiative, +5% resolve damage
  - Adjacent clashing characters: -1 initiative, -5% resolve damage
  - Adjacency checked at turn start (not just initial placement)
- [ ] Post-combat results: money rewards, morale changes, injury tracking
  - Defeated player characters get a recovery timer (unavailable for N missions)
  - Results displayed, then transition to CommuneScene
- [ ] Wire Missions button on CommuneScene to MissionSelect
- [ ] CommuneState tracks available missions (refreshed after events/progression)

**Test:** Pick a mission. Select squad. See chemistry effects. Fight. Bond buffs actually work in combat. Win. Get rewards. Return to commune with updated state.

---

## C5: Recruitment

**Goal:** New characters appear. Player evaluates and decides. Roster grows.

- [ ] Create `src/game/RecruitmentManager.ts` — data-driven
  - Generates recruits from a pool (not hardcoded specific characters)
  - After every N missions, a recruit arrives
  - Picks class, traits, stats from weighted pools
- [ ] Create `src/data/recruit_pool.ts` — recruitment templates as data
  - Class templates with stat ranges
  - Name pools per class
  - Trait assignment weights per class
- [ ] Wire recruitment using dialogue engine:
  - Recruit notification on CommuneScene
  - Click → dim-and-spotlight, new character introduces themselves (dialogue mode)
  - Show full card (stats mode) + compatibility preview via RelationshipManager
  - Accept / Reject / Accept and kick someone
  - Capacity check against commune limit
- [ ] On accept: add to roster, RelationshipManager recalculates, welcome event may queue

**Test:** After a mission, recruit notification appears. Meet new character. See their traits and who they'll clash with. Accept them. They appear in the roster with relationships calculated.

---

## C6: Building Upgrades

**Goal:** Spend money for passive bonuses. Upgrades feed into existing systems via modifiers.

- [ ] Create `src/data/upgrades.ts` — upgrade definitions as data
  - Kitchen, Common Room, Rooftop, Basement — each with levels, costs, effects
  - Effects defined as modifier keys that existing systems already read:
    - EventManager reads `frequencyModifier` (built into C3)
    - CommuneState reads morale modifiers
    - CommuneState reads capacity modifier
    - CommuneState reads passive income
- [ ] Create `src/rendering/UpgradeMenu.ts` — dim-and-spotlight list UI
  - Current level, next level cost/effect, buy button
- [ ] Wire: CommuneState.upgrades affects all relevant systems
- [ ] Wire: Upgrades button on CommuneScene opens UpgradeMenu

**Test:** Buy Kitchen L2. Money drops. EventManager's frequency modifier changes. Fewer conflict events fire.

---

## C7: Trait Combat Abilities & Visual Indicators

**Goal:** Individual traits have unique combat effects beyond the bond/clash modifiers from C4.

C4 handled the relationship-based buffs (adjacent bond = +damage, adjacent clash = -initiative). C7 is about trait-specific combat mechanics that are more complex.

- [ ] Per-trait combat effects (each is a small, isolated piece of logic):
  - Empathetic: heal adjacent allies 5 resolve/turn
  - Paranoid: immune to flanking bonuses
  - Contrarian: +15% damage when outnumbered (more enemies than allies alive)
  - Self-Righteous: +10% damage when target below 50% resolve
  - Each trait with a combat effect gets a handler function in a traits combat module
- [ ] Visual indicators on character sprites: small icons showing active trait effects
- [ ] Trait effects are data-driven: the trait definition references a combat handler ID, so new traits with combat effects can be added without touching the engine

**Test:** Empathetic character heals an adjacent ally each turn. Contrarian does bonus damage when outnumbered. Icons show which effects are active.

---

## C8: Content, Polish & Full Loop

**Goal:** 30-60 minute playable session. The loop works end to end.

- [ ] 15-20 events across trait combinations
- [ ] 5-8 missions across 2-3 enemy factions with escalating difficulty
- [ ] 8-10 recruitable characters with distinct personalities and trait combos
- [ ] Difficulty curve: early missions easy, later require good squad chemistry
- [ ] Game over: morale hits 0 (everyone leaves) or key story mission failed
- [ ] Progression: threats escalate, forcing upgrades and better management
- [ ] Title screen with New Game
- [ ] Commune background art (placeholder acceptable)
- [ ] Tuning pass: money economy, morale rates, event frequency, combat balance
- [ ] Save system (if time permits — deferred from earlier milestones for good reason)

**Test:** Play for 30 minutes. Full loop multiple times. Choices matter. Win or lose based on both management and combat.

---

## Visual / Art Pipeline Notes

**Current state:** CommuneScene layout is satisfactory but all UI is drawn with PixiJS Graphics primitives (rect, roundRect, fill). This gives a flat "MS Paint" feel regardless of how many layers or gradients are applied.

**Required: Pre-rendered texture sprites.** Once the LoRA art pipeline is running:
- Generate 9-slice panel textures for cards, buttons, and badges (dark themed, painted/stylized)
- Generate a night sky background texture with actual atmospheric depth
- Generate building facade texture to replace programmatic rectangles
- Generate UI frame/border textures for the roster panel and nav panel
- Replace Graphics.roundRect() calls with Sprite-based 9-slice panels using the generated textures
- This is the single biggest visual quality upgrade possible — no amount of code-drawn shapes will look like a real game

**Font:** Current Segoe UI is placeholder. Find and load a stylized game font (e.g. Fredoka, Press Start 2P for headers, or custom via LoRA-adjacent generation). Load as web font, pass to PixiJS Text style.

**Character art:** Weekend task — draw 30-40 caricatures on blank A4, train style LoRA, generate 4 expressions per character (neutral, angry, happy, defeated). This transforms the roster cards overnight.

---

## Current Status

**Active Milestone:** C2 — Personality Traits & Relationships (next)
**Completed:** Prerequisite (parameterize CombatScene), C0 (CommuneScene + dialogue engine), C1 (hub, roster, combat round-trip)
**What exists:** Complete combat system (M0-M8), SceneManager, EventBus, GSAP infrastructure, dialogue engine in CommuneScene, commune hub with Tim Burton building, cityline, street lamp, collapsible panels, dark atmospheric palette
