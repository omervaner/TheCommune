# The Commune — Development Plan

## Philosophy

Every milestone produces something you can SEE and INTERACT with in the browser.
Each milestone builds on the previous one — no throwaway code, no rewrites.
The architecture is designed so new features plug in without touching existing systems.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    Game                          │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │  Scene    │   │  Scene   │   │  Scene   │    │
│  │ Manager   │──▶│ Combat   │   │ Commune  │    │
│  │          │   │          │   │ (future) │    │
│  └──────────┘   └──────────┘   └──────────┘    │
│                      │                           │
│         ┌────────────┼────────────┐              │
│         ▼            ▼            ▼              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Combat   │ │ Renderer │ │  Input   │        │
│  │  Engine   │ │  Layer   │ │ Handler  │        │
│  │ (data)    │ │ (visual) │ │ (clicks) │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│       │              │            │              │
│       ▼              ▼            │              │
│  ┌──────────┐ ┌──────────┐       │              │
│  │  Event   │ │ Animation │       │              │
│  │   Bus    │◀│ Manager   │◀──────┘              │
│  └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────┘
```

### Key Principles

**Game** — Top-level class. Owns the PixiJS Application, manages scenes.
**SceneManager** — Swaps between scenes (combat, commune, menus). Only one active at a time.
**CombatScene** — Owns everything combat-related. Has its own setup/teardown lifecycle.
**CombatEngine** — Pure data. No rendering. Processes actions, emits events.
**Renderer Layer** — Listens to CombatEngine events, draws things. Never mutates game state.
**InputHandler** — Translates clicks/hovers into game actions. Talks to CombatEngine.
**EventBus** — Global typed event bus. Decouples everything. The spine of the system.
**AnimationManager** — Queues animations. Combat waits for animations to finish before proceeding.

### Why This Matters

When you add the commune management layer later, it's a new Scene. Combat doesn't change.
When you add new character classes, you add data + abilities. Engine doesn't change.
When you add new UI elements (cards, initiative bar), they subscribe to events. Nothing else changes.
When you add enemy AI, it plugs into the same action system players use.

---

## File Structure

```
src/
  main.ts                    — App bootstrap (~5 lines, creates Game + CombatScene) ✅
  Game.ts                    — Top-level game class, owns PixiJS app ✅
  EventBus.ts                — Typed event emitter, global communication ✅

  scenes/
    SceneManager.ts          — Scene lifecycle (enter/exit/update) ✅
    CombatScene.ts           — Combat scene: wires engine + renderers + input + animations ✅

  game/
    types.ts                 — All interfaces/types ✅
    CombatEngine.ts          — State machine, turn logic, action processing, defeat ✅
    Grid.ts                  — Grid queries, pathfinding, range calc ✅
    AbilityResolver.ts       — Damage calc, preview + execute, status effects ✅
    AI.ts                    — Enemy turn decision-making ✅

  input/
    InputHandler.ts          — Click/hover → game actions (offset-corrected) ✅
    TileSelector.ts          — Highlight logic for move/attack/AoE ranges ✅

  rendering/
    GridRenderer.ts          — Isometric tile drawing ✅
    CharacterRenderer.ts     — Character sprites, resolve bars, idle bob, damage previews ✅
    InitiativeBar.ts         — Turn order display at top ✅
    ResolveBar.ts            — Resolve bar drawing utility with ghost segment ✅
    HUD.ts                   — Ability buttons with cooldown display ✅
    CharacterCard.ts         — Floating stat card with flip animation ✅

  animation/
    AnimationManager.ts      — Counter-based animation tracker, blocks input while playing ✅
    Tweens.ts                — GSAP animations: move, attack, hit, shake, defeat, idle, damage numbers ✅

  data/
    characters.ts            — Character factory functions (Karen, Therapist, Dave, Goon) ✅

  audio/
    SoundManager.ts          — Howler.js wrapper, subscribes to EventBus, maps events to sounds ✅

  utils/
    iso.ts                   — Isometric math (gridToScreen, screenToGrid, distance) ✅
    constants.ts             — Game-wide constants (grid size, tile dims, colors, char sizes) ✅
```

---

## Milestones

### M0: Foundation (Refactor What Exists)
**Goal:** Clean architecture. Everything off main.ts. Systems can talk to each other.

- [x] Create `EventBus.ts` — typed events, replace CombatEngine's custom emitter
- [x] Create `Game.ts` — owns PixiJS app, manages resize, holds scene manager
- [x] Create `SceneManager.ts` — simple scene stack (enter/exit)
- [x] Create `CombatScene.ts` — moves all combat setup out of main.ts
- [x] Create `constants.ts` — extract GRID_SIZE, TILE_WIDTH, colors, etc.
- [x] `main.ts` becomes 5 lines: create Game, start CombatScene

**Test:** Same visual result as now (grid renders), but codebase is modular.

---

### M1: Characters On The Grid
**Goal:** See characters on tiles. Click a tile to select it.

- [x] Create `CharacterRenderer.ts` — draws colored circles with letters on tiles
- [x] Create `InputHandler.ts` — detects which tile was clicked (screenToGrid)
- [x] Characters appear on their grid positions
- [x] Clicking a tile highlights it yellow
- [x] Clicking a character tile logs their info to console

**Test:** You see Karen (K), Therapist (T), Dave (C), and two red Goons. Clicking works.

---

### M2: Movement
**Goal:** Select a character, see where they can move, click to move them.

- [x] Create `TileSelector.ts` — highlights reachable tiles on character select
- [x] Wire InputHandler: click own character → show blue move tiles
- [x] Click a blue tile → character moves there (instant, no animation yet)
- [x] Grid state updates, tile occupancy updates
- [x] Can only select your own team's characters

**Test:** Select Karen, see blue tiles, click one, she moves. Grid state is correct.

---

### M3: Turn System
**Goal:** Turn-based flow. Initiative order. Move once, act once, then next turn.

- [x] Create `InitiativeBar.ts` — row of portraits at top, current turn highlighted
- [x] Implement turn advancement in CombatEngine
- [x] After move+act (or end turn button), next character's turn starts
- [x] Enemy turns are skipped for now (just auto-end)
- [x] Visual indicator of whose turn it is (tile glow, initiative highlight)

**Test:** Turns cycle through all characters. Initiative bar shows the order.

---

### M4: Abilities & Targeting
**Goal:** Use abilities. Select a target. Deal resolve damage.

- [x] Create `HUD.ts` — ability buttons appear when it's your turn
- [x] Create `AbilityResolver.ts` — calculate damage, apply to target
- [x] Create `ResolveBar.ts` — small bar above each character showing resolve
- [x] Click ability → show red target range → click target → ability fires
- [x] Target's resolve decreases
- [x] If resolve hits 0, character is defeated (removed from grid and turn order)

**Test:** Karen uses "Speak to Manager" on a Goon. Goon's resolve drops. Kill a Goon.

---

### M5: Animation
**Goal:** Make it FEEL good. This is where the game gets its soul.

- [x] Create `AnimationManager.ts` — queue system, combat waits for animations
- [x] Create `Tweens.ts` — attack slide, hit flash, screen shake, defeat fade
- [x] Movement: character slides along path (not teleport)
- [x] Attack: attacker slides toward target, impact flash, slide back
- [x] Hit: target flashes red, slight pushback, screen shakes
- [x] Damage numbers float up from target
- [x] Defeat: target fades, collapses, removed
- [x] Idle: subtle sine-wave bob on all characters

**Test:** A full combat exchange looks and feels like a real game.

---

### M6: Character Cards
**Goal:** Rich character info on hover/select.

- [x] Create `CharacterCard.ts` — stat panel (name, class, resolve, abilities, status)
- [x] Flip-in animation when card appears
- [x] Hover over any character → small card
- [x] Select a character → large card (upper-right corner)
- [x] Drop shadows on cards and UI elements

**Test:** Hover over Karen, see her stats flip in. Click her, see full card.

---

### M7: Enemy AI
**Goal:** Enemies take real turns. The game is now playable start-to-finish.

- [x] Create `AI.ts` — decision engine for enemy turns
- [x] Simple logic: move toward nearest player, use ability if in range
- [x] AI uses the same action system as players (moveCharacter, useAbility)
- [x] Win condition: all enemies defeated → victory message
- [x] Lose condition: all players defeated → defeat message

**Test:** Play a full combat encounter from start to finish. Win or lose.

---

### M8: Polish & Juice
**Goal:** Make it feel like a finished prototype.

- [x] AoE ability visualization (area highlight) — done in M4 (blast radius preview on hover)
- [x] Status effect visuals (icons above characters) + tick system (duration, resolveDelta, movementMod)
- [x] Turn transition animation (banner slide-in with character name)
- [x] Sound effects (Howler.js) — SoundManager subscribes to EventBus events, placeholder WAVs in public/audio/
- [x] Victory/defeat screen (styled panel with stats, staggered reveals, Play Again button)
- [x] Ability cooldown tracking and display — done in M4 (grayed buttons + cooldown counter)
- [x] Camera: subtle zoom on active character (1.1x scale pulse on turn start)

**Test:** Show someone the game. They understand what's happening without explanation.

---

## Rules For Claude Code

When working on any milestone:

1. Read CLAUDE.md first. Every time.
2. Check which milestone we're on. Don't skip ahead.
3. Don't modify files from completed milestones unless the current milestone requires it.
4. Run `npm run dev` after changes to verify it compiles.
5. Each new file gets a header comment explaining its single responsibility.
6. Game logic never imports from pixi.js. Rendering never mutates game state.
7. All communication between systems goes through EventBus.
8. When done with a milestone, update this file: check off the boxes.

---

## Current Status

**All Milestones Complete:** M0–M8 done.
**What exists:** Fully playable combat: turn-based movement, abilities with targeting, Into the Breach-style damage previews, defeat system, cooldowns, initiative bar, HUD, character cards (hover + detail), GSAP animations, and enemy AI (move toward nearest player, attack if in range, same animations as player). Sprite support in CharacterRenderer — Karen uses a 48px south-east-facing sprite, others fall back to colored circles. M8 polish: status effect tick system + icons, turn transition banners + camera zoom (1.1x pulse), enhanced victory/defeat screen with stats + Play Again, Howler.js SoundManager wired to EventBus events.
**What's next:** Audio files in public/audio/ are placeholder sine waves — swap for real game SFX. More character sprites. Beyond M8: commune management layer, more characters/abilities, save system.
