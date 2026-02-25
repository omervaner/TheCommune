# The Commune — Claude Code Project Guide

## What This Is

A turn-based tactical social combat game with a character-driven management layer. Think Into the Breach combat meets Darkest Dungeon roster management, wrapped in modern-day satire. Caricatures (Karen, Conspiracy Theorist, Therapist, etc.) live in a commune, clash over personality differences, and fight external threats using arguments, guilt trips, and social manipulation on an isometric grid.

The game has two layers:
1. **Combat** — Isometric grid tactics. Resolve bars instead of HP. COMPLETE (M0–M8).
2. **Commune Management** — Character-driven management between battles. Roster, events, recruitment, missions, upgrades. IN PROGRESS (C0–C8).

## Stack

- **TypeScript** — strict mode
- **PixiJS 8** — 2D rendering. Import from `pixi.js`
- **GSAP 3** — all animation. Import from `gsap`
- **Howler.js** — audio. Import from `howler`
- **Vite** — dev server and bundler

## Project Structure

```
src/
  main.ts                      — App bootstrap (~5 lines)
  Game.ts                      — Owns PixiJS Application, SceneManager, ticker
  EventBus.ts                  — Generic typed event emitter (on/emit/clear)

  scenes/
    SceneManager.ts            — Scene interface + lifecycle (start/update/getActive)
    CombatScene.ts             — Combat orchestrator ✅ COMPLETE
    CommuneScene.ts            — Management hub (roster, buttons, navigation)

  game/
    types.ts                   — Combat interfaces + CombatEvents
    types_commune.ts           — Commune interfaces + CommuneEvents
    CombatEngine.ts            — Combat state machine, turns, defeat ✅ COMPLETE
    CommuneState.ts            — Between-combat state (roster, money, morale, events)
    Grid.ts                    — Grid queries, pathfinding ✅ COMPLETE
    AbilityResolver.ts         — Damage calc, status effects ✅ COMPLETE
    AI.ts                      — Enemy combat AI ✅ COMPLETE
    RelationshipManager.ts     — Trait-based bonds/clashes between characters
    EventManager.ts            — Commune event triggers, evaluation, outcome processing
    RecruitmentManager.ts      — Generate and manage recruit offers

  dialogue/
    types.ts                   — DialogueScript, DialogueStep, Choice, Outcome
    DialogueEngine.ts          — Pure data: processes dialogue scripts step by step

  input/
    InputHandler.ts            — Click/hover → grid events ✅ COMPLETE
    TileSelector.ts            — Move/attack range highlights ✅ COMPLETE

  rendering/
    GridRenderer.ts            — Isometric grid ✅ COMPLETE
    CharacterRenderer.ts       — Character sprites, resolve bars, idle bob ✅ COMPLETE
    InitiativeBar.ts           — Turn order display ✅ COMPLETE
    ResolveBar.ts              — Resolve bar utility ✅ COMPLETE
    HUD.ts                     — Ability buttons ✅ COMPLETE
    CharacterCard.ts           — Hover/select stat cards ✅ COMPLETE
    DialogueRenderer.ts        — Dim-and-spotlight, speech bubbles, choice panel
    PortraitCard.ts            — Dual-mode card (stats mode ↔ dialogue mode)
    MissionSelect.ts           — Mission picker with squad chemistry preview
    UpgradeMenu.ts             — Building upgrade list

  animation/
    AnimationManager.ts        — Animation tracker ✅ COMPLETE
    Tweens.ts                  — GSAP animation library ✅ COMPLETE

  audio/
    SoundManager.ts            — Howler.js wrapper ✅ COMPLETE

  data/
    characters.ts              — Player character factories ✅ COMPLETE
    traits.ts                  — Personality trait definitions
    events.ts                  — Commune event scripts with dialogue
    missions.ts                — Mission templates (threat, enemies, rewards)
    enemies.ts                 — Enemy templates by faction
    upgrades.ts                — Building upgrade definitions
    recruit_pool.ts            — Recruitable character templates

  utils/
    constants.ts               — Shared constants ✅ COMPLETE
    iso.ts                     — Isometric math ✅ COMPLETE
```

## Architecture Rules

1. **Separation of data and rendering.** `game/` and `dialogue/` never import PixiJS. `rendering/` reads state but never mutates it.

2. **Two sources of truth.** CombatEngine owns combat state. CommuneState owns between-combat state. They never cross-reference directly — CombatScene reads from CommuneState at setup (squad, trait buffs), and writes results back after combat ends.

3. **Event-driven updates.** EventBus connects everything. Renderers subscribe to events. State changes emit events. No direct coupling.

4. **The dim-and-spotlight pattern.** All commune interactions (events, recruitment, mission select, upgrades) use one visual system: dim the background, spotlight character cards, show dialogue/choices, dismiss. DialogueRenderer handles this universally.

5. **One card, two modes.** PortraitCard shows stats mode (roster, combat) or dialogue mode (events, recruitment). Same art asset, different presentation. GSAP tweens the transition.

6. **Traits drive everything in the commune.** Personality traits cause clashes, form bonds, trigger events, modify combat stats, and create comedy. They're the mechanical spine of the management layer.

## Design Documents

- **`GAME_DESIGN.md`** — Original game concept, tone, classes, combat design
- **`COMMUNE_LAYER_DESIGN.md`** — Full management layer design: cards, dim-and-spotlight, traits, events, roster, recruitment, missions, upgrades, progression loop
- **`COMMUNE_ROADMAP.md`** — Implementation milestones C0–C8 with task lists
- **`DEVELOPMENT_PLAN.md`** — Combat milestones M0–M8 (ALL COMPLETE)

**READ the active roadmap before doing any work.** Check which milestone is active. Only work on that milestone.

## Running The Project

```bash
npm install    # first time only
npm run dev    # starts Vite dev server on localhost:3000
```

## Key Conventions

- All files use named exports, no default exports
- One class/module per file
- Comments explain WHY, not WHAT
- Game logic (`game/`, `dialogue/`) never imports from `pixi.js`
- Rendering never mutates game state
- All communication between systems goes through EventBus
- Ability names and event dialogue should be funny and in-character
- **Nothing is hardcoded.** Every system is data-driven and parameterized from birth. Test with minimal data, not hardcoded values.
- **Build it where it lives.** Don't build in a temporary location and move later.
- **Don't define types until they're used.** Interfaces are created in the milestone that first needs them.
- Don't skip milestones. Don't build features from a later milestone.
- Don't rewrite files from completed milestones unless the current milestone explicitly requires it.

## What NOT To Do

- Don't add a physics engine
- Don't add pathfinding libraries — BFS on a 10x10 grid is trivial
- Don't create animation sprite sheets — all motion is GSAP tweens
- Don't add networking/multiplayer
- Don't add a save system yet
- Don't build the commune as a spatial/tile-based base builder — it's a roster board with menus
- Don't create background art for dialogue scenes — the dim-and-spotlight pattern means the current screen IS the background
- Don't use default exports
- Don't put game logic in renderers
- Don't skip ahead in the milestone plan

## Current Status

**Combat:** COMPLETE (M0–M8). Fully playable tactical combat with turns, abilities, AI, animations, sound.
**Commune:** IN PROGRESS. Active milestone: C0 — Dialogue Engine.
**Art:** Karen has a 48px sprite. Others use colored circle fallback. Portrait art pending (weekend LoRA work).
