# The Commune — Claude Code Project Guide

## What This Is

A turn-based tactical social combat game. Think Into the Breach meets Monkey Island insult sword fighting. Modern-day caricatures (Karen, Conspiracy Theorist, Therapist, etc.) fight on a 10x10 isometric grid using arguments, guilt trips, and social manipulation instead of weapons. Characters have Resolve bars instead of HP — break someone's resolve and they're out (convinced, intimidated, fled, or embarrassed).

## Stack

- **TypeScript** — strict mode, all types in `src/game/types.ts`
- **PixiJS 8** — 2D rendering (sprites, grid, UI). Import from `pixi.js`
- **GSAP 3** — all animation (tweens, screen shake, card flips). Import from `gsap`
- **Howler.js** — audio (not needed yet for v0.1)
- **Vite** — dev server and bundler

## Project Structure

```
src/
  main.ts              — App bootstrap (~5 lines, creates Game + CombatScene)
  Game.ts              — Owns PixiJS Application, SceneManager, ticker
  EventBus.ts          — Generic typed event emitter (on/emit/clear)
  game/
    types.ts           — All TypeScript interfaces/types + CombatEvents map
    CombatEngine.ts    — Combat state machine, turn management, defeat (uses EventBus)
    Grid.ts            — Grid data operations (pathfinding, range calc, tile queries)
    AbilityResolver.ts — Preview + execute abilities, damage calc, status effects
    AI.ts              — Enemy turn decision-making (move toward nearest, attack if in range)
  scenes/
    SceneManager.ts    — Scene interface + SceneManager (start/update/getActive)
    CombatScene.ts     — Combat orchestrator: wires engine + renderers + input + animations
  input/
    InputHandler.ts    — Click/hover → grid-space events (offset-corrected for grid container)
    TileSelector.ts    — Highlight logic for move/attack/AoE ranges
  rendering/
    GridRenderer.ts    — Draws the isometric 10x10 grid
    CharacterRenderer.ts — Character visuals (sprite textures or circle fallback), resolve bars, idle bob, damage previews
    InitiativeBar.ts   — Top-of-screen turn order display
    ResolveBar.ts      — Resolve bar drawing utility with ghost segment for previews
    HUD.ts             — Ability buttons with cooldown display
    CharacterCard.ts   — Hover/select character info cards with flip animation
  animation/
    AnimationManager.ts — Counter-based animation tracker, blocks input while playing
    Tweens.ts          — GSAP animations (move, attack, hit, shake, defeat, idle, damage numbers, turn banner, camera focus)
  audio/
    SoundManager.ts    — Howler.js wrapper, subscribes to EventBus events, maps to sound files
  data/
    characters.ts      — Character factory functions (Karen, Therapist, Dave, Goon)
  utils/
    constants.ts       — Shared constants (grid, tile, character sizes, colors)
    iso.ts             — Isometric math conversions (gridToScreen, screenToGrid, etc.)
```

## Architecture Rules

1. **Separation of data and rendering.** Game logic in `game/` never imports PixiJS. Rendering in `ui/` reads game state but never mutates it. Animation in `animation/` only receives PixiJS display objects to animate.

2. **CombatState is the single source of truth.** The combat state machine drives everything. UI reads from it. Actions modify it. Never store game state in renderers.

3. **Event-driven updates.** When combat state changes, emit events. Renderers listen and update visuals. Use a simple EventEmitter pattern (not PixiJS events).

4. **Types are already defined.** Check `src/game/types.ts` before creating any new interfaces. Character, Ability, Tile, Grid, CombatState, TurnPhase — they're all there.

5. **Isometric math is already done.** Check `src/utils/iso.ts` for gridToScreen, screenToGrid, gridDistance, isValidTile. Don't rewrite these.

6. **Characters are already defined.** Check `src/data/characters.ts` for Karen, Therapist, Conspiracy Theorist, and Corporate Goon factories.

## Combat Flow (What To Build)

The core turn loop:

1. Sort characters by initiative → build turn order
2. Current character's turn starts → highlight their tile, show in initiative bar
3. Player picks: MOVE or ACT (can do both, in either order, once each per turn)
4. MOVE: show reachable tiles (BFS within movement range), click to move, animate walk
5. ACT: show ability buttons, pick one, show valid targets highlighted, click target, animate attack, resolve damage
6. After move+act (or player ends turn), advance to next character
7. Enemy turns: simple AI — move toward nearest player, use ability if in range
8. Win: all enemies defeated. Lose: all players defeated.

## Visual Design

- **Isometric 2D grid**, 10x10, diamond layout
- **Static sprites** — no frame-by-frame animation. All motion via GSAP tweens
- **Attack animation**: sprite slides toward target, flash on impact, slide back
- **Hit animation**: target flashes red, screen shakes slightly, damage number floats up
- **Defeat animation**: sprite fades out and collapses
- **Idle**: gentle sine-wave hover (subtle vertical bob)
- **Initiative bar**: top of screen, horizontal row of character portraits, current turn highlighted
- **Character card**: floating panel with stats, appears on hover/select with a flip animation
- **Everything casts drop shadows** — use PixiJS DropShadowFilter
- **Color palette**: muted/desaturated with bright accents for highlights and abilities

## Character Art

- Sprite textures go in `public/sprites/<name>/rotations/` with 8 directions (south, south-east, east, etc.)
- CharacterRenderer maps `CharacterClass` to a sprite path via `SPRITE_PATHS`. Default facing is south-east (isometric camera angle).
- Characters without a sprite entry fall back to colored circles with a letter label.
- Currently Karen has a 48px sprite; all others use circle fallback.
- Tiles: diamond shapes, light gray for walkable, dark for blocked
- Highlight colors: blue for move range, red for attack range, yellow for selected

## Running The Project

```bash
npm install    # first time only
npm run dev    # starts Vite dev server on localhost:3000, auto-opens browser
```

## Key Conventions

- All files use named exports, no default exports
- One class/module per file
- Comments explain WHY, not WHAT
- Ability names should be funny and in-character (they're arguments, not spells)
- When in doubt, keep it simple — this is v0.1, not the final game

## Development Plan

READ `DEVELOPMENT_PLAN.md` before doing any work. It contains:
- The full architecture diagram
- Milestones in order (M0 through M8)
- What to build for each milestone
- The current active milestone

Never skip milestones. Never build features from a later milestone.
Always check which milestone is active and only work on that.

## What NOT To Do

- Don't add a physics engine
- Don't add pathfinding libraries — BFS on a 10x10 grid is trivial
- Don't create animation sprite sheets
- Don't add networking/multiplayer
- Don't add a save system yet
- Don't over-engineer the management layer — v0.1 is combat only
- Don't use default exports
- Don't put game logic in renderers
- Don't skip ahead in the milestone plan
- Don't rewrite files from completed milestones unless the current milestone explicitly requires it
