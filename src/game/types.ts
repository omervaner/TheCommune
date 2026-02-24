/**
 * Core type definitions for The Commune's combat system.
 */

import type { GridPosition } from '@utils/iso';

/** Character archetype classes */
export type CharacterClass = 
  | 'conspiracy_theorist'
  | 'vegan'
  | 'karen'
  | 'ex_lawyer'
  | 'influencer'
  | 'doomsday_preacher'
  | 'therapist'
  | 'corporate_goon';

/** Ability targeting type */
export type TargetType = 'single' | 'aoe' | 'self' | 'line';

/** What happens when resolve hits zero */
export type DefeatType = 'convinced' | 'intimidated' | 'fled' | 'embarrassed';

export interface Ability {
  id: string;
  name: string;
  description: string;
  targetType: TargetType;
  range: number;
  aoeRadius?: number;
  resolveDamage: number;
  cooldown: number;
  currentCooldown: number;
  /** Special effects applied on hit */
  effects?: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  name: string;
  duration: number;
  /** Resolve damage per turn (negative = healing) */
  resolveDelta?: number;
  /** Movement modifier */
  movementMod?: number;
}

export interface Character {
  id: string;
  name: string;
  class: CharacterClass;
  
  /** Combat stats */
  maxResolve: number;
  currentResolve: number;
  movement: number;
  initiative: number;
  
  /** Grid position */
  position: GridPosition;
  
  /** Available abilities */
  abilities: Ability[];
  
  /** Active status effects */
  statusEffects: StatusEffect[];
  
  /** Which side: player or enemy */
  team: 'player' | 'enemy';
  
  /** Is this character still in the fight */
  isDefeated: boolean;
  defeatType?: DefeatType;
}

export interface Tile {
  col: number;
  row: number;
  walkable: boolean;
  occupant?: Character;
  /** Visual state for highlights */
  highlight?: 'move' | 'attack' | 'selected' | 'none';
}

export type Grid = Tile[][];

/** Turn phases */
export type TurnPhase = 'select_action' | 'select_move' | 'select_target' | 'animating' | 'enemy_turn';

export interface CombatStats {
  turnsPlayed: number;
  totalDamageDealt: number;
  enemiesDefeated: number;
  playersRemaining: number;
}

export interface CombatState {
  grid: Grid;
  characters: Character[];
  turnOrder: Character[];
  currentTurnIndex: number;
  phase: TurnPhase;
  selectedAbility?: Ability;
  /** Has the current character moved this turn */
  hasMoved: boolean;
  /** Has the current character used an ability this turn */
  hasActed: boolean;
  /** Tracks combat performance for end screen */
  stats: CombatStats;
}

/** Events emitted by the CombatEngine via EventBus */
export interface CombatEvents {
  phaseChange: [phase: TurnPhase];
  abilitySelected: [ability: Ability];
  moved: [];
  acted: [];
  turnStart: [character: Character];
  turnEnd: [character: Character];
  characterMoved: [character: Character, position: GridPosition];
  stateChanged: [];
  tileClicked: [col: number, row: number];
  tileHovered: [col: number, row: number];
  stageClicked: [];
  abilityUsed: [ability: Ability, attacker: Character, targets: Character[]];
  characterDefeated: [character: Character];
  statusEffectApplied: [character: Character, effect: StatusEffect];
  statusEffectExpired: [character: Character, effect: StatusEffect];
}
