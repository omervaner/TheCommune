/**
 * Combat state machine — the single source of truth for all game state.
 * Emits events via an injected EventBus so renderers can update.
 * Pure data module: no PixiJS imports.
 */

import type { CombatState, Character, TurnPhase, Ability, CombatEvents, StatusEffect } from '@game/types';
import { createGrid, clearHighlights } from '@game/Grid';
import type { EventBus } from '../EventBus';

export class CombatEngine {
  private state: CombatState;
  private bus: EventBus<CombatEvents>;

  constructor(characters: Character[], bus: EventBus<CombatEvents>) {
    this.bus = bus;
    const grid = createGrid();

    // Place characters on the grid
    for (const char of characters) {
      const tile = grid[char.position.col][char.position.row];
      tile.occupant = char;
    }

    // Sort by initiative (highest first)
    const turnOrder = [...characters]
      .filter((c) => !c.isDefeated)
      .sort((a, b) => b.initiative - a.initiative);

    this.state = {
      grid,
      characters,
      turnOrder,
      currentTurnIndex: 0,
      phase: 'select_action',
      hasMoved: false,
      hasActed: false,
      stats: {
        turnsPlayed: 0,
        totalDamageDealt: 0,
        enemiesDefeated: 0,
        playersRemaining: characters.filter((c) => c.team === 'player').length,
      },
    };
  }

  /** Read-only access to the current state */
  getState(): Readonly<CombatState> {
    return this.state;
  }

  /** Get the character whose turn it currently is */
  getCurrentCharacter(): Character {
    return this.state.turnOrder[this.state.currentTurnIndex];
  }

  /** Change the turn phase */
  setPhase(phase: TurnPhase): void {
    this.state.phase = phase;
    this.bus.emit('phaseChange', phase);
  }

  /** Select an ability for targeting */
  selectAbility(ability: Ability): void {
    this.state.selectedAbility = ability;
    this.setPhase('select_target');
    this.bus.emit('abilitySelected', ability);
  }

  /** Mark that the current character has moved */
  markMoved(): void {
    this.state.hasMoved = true;
    this.bus.emit('moved');
    this.checkTurnEnd();
  }

  /** Mark that the current character has acted */
  markActed(): void {
    this.state.hasActed = true;
    this.state.selectedAbility = undefined;
    this.bus.emit('acted');
    this.checkTurnEnd();
  }

  /** Advance to the next character's turn */
  nextTurn(): void {
    this.state.currentTurnIndex =
      (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
    this.state.hasMoved = false;
    this.state.hasActed = false;
    this.state.selectedAbility = undefined;
    clearHighlights(this.state.grid);

    const current = this.getCurrentCharacter();

    // Tick cooldowns at the start of each character's turn
    for (const ability of current.abilities) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown--;
      }
    }

    // Tick status effects: apply per-turn resolve delta, decrement duration, expire
    this.tickStatusEffects(current);

    const phase: TurnPhase = current.team === 'enemy' ? 'enemy_turn' : 'select_action';
    this.state.phase = phase;

    this.bus.emit('turnStart', current);
    this.bus.emit('phaseChange', phase);
  }

  /** Get effective movement for a character (base + movementMod from status effects) */
  getEffectiveMovement(char: Character): number {
    let mod = 0;
    for (const effect of char.statusEffects) {
      if (effect.movementMod) mod += effect.movementMod;
    }
    return Math.max(0, char.movement + mod);
  }

  private tickStatusEffects(char: Character): void {
    // Apply resolve delta from each effect
    for (const effect of char.statusEffects) {
      if (effect.resolveDelta) {
        char.currentResolve = Math.max(0, Math.min(char.maxResolve,
          char.currentResolve - effect.resolveDelta));
      }
    }

    // Decrement durations and collect expired effects
    const expired: StatusEffect[] = [];
    char.statusEffects = char.statusEffects.filter((effect) => {
      effect.duration--;
      if (effect.duration <= 0) {
        expired.push(effect);
        return false;
      }
      return true;
    });

    for (const effect of expired) {
      this.bus.emit('statusEffectExpired', char, effect);
    }

    this.bus.emit('stateChanged');
  }

  /** Move a character to a new position */
  moveCharacter(char: Character, col: number, row: number): void {
    // Remove from old tile
    const oldTile = this.state.grid[char.position.col][char.position.row];
    oldTile.occupant = undefined;

    // Place on new tile
    char.position = { col, row };
    const newTile = this.state.grid[col][row];
    newTile.occupant = char;

    this.bus.emit('characterMoved', char, { col, row });
  }

  /** Cancel ability selection, return to select_action */
  cancelAbility(): void {
    this.state.selectedAbility = undefined;
    this.setPhase('select_action');
  }

  /** Mark a character as defeated and remove from play */
  defeatCharacter(char: Character): void {
    char.isDefeated = true;
    char.defeatType = 'embarrassed';

    // Clear from grid
    const tile = this.state.grid[char.position.col][char.position.row];
    if (tile.occupant === char) {
      tile.occupant = undefined;
    }

    // Remove from turn order
    const idx = this.state.turnOrder.indexOf(char);
    if (idx !== -1) {
      this.state.turnOrder.splice(idx, 1);
      if (idx < this.state.currentTurnIndex) {
        this.state.currentTurnIndex--;
      } else if (this.state.currentTurnIndex >= this.state.turnOrder.length) {
        this.state.currentTurnIndex = 0;
      }
    }

    if (char.team === 'enemy') {
      this.state.stats.enemiesDefeated++;
    } else {
      this.state.stats.playersRemaining--;
    }

    this.bus.emit('characterDefeated', char);
  }

  /** End the current character's turn and advance to the next */
  endTurn(): void {
    this.bus.emit('turnEnd', this.getCurrentCharacter());
    this.state.stats.turnsPlayed++;
    this.nextTurn();
  }

  /** Record damage dealt (called by scene after ability execution) */
  recordDamage(amount: number): void {
    this.state.stats.totalDamageDealt += amount;
  }

  /** Check if combat is over */
  checkVictory(): 'player_wins' | 'enemy_wins' | null {
    const hasPlayers = this.state.characters.some((c) => c.team === 'player' && !c.isDefeated);
    const hasEnemies = this.state.characters.some((c) => c.team === 'enemy' && !c.isDefeated);
    if (!hasEnemies) return 'player_wins';
    if (!hasPlayers) return 'enemy_wins';
    return null;
  }

  private checkTurnEnd(): void {
    if (this.state.hasMoved && this.state.hasActed) {
      this.bus.emit('turnEnd', this.getCurrentCharacter());
    }
  }
}
