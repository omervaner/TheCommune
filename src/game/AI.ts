/**
 * Enemy turn decision-making.
 * Pure data module: no PixiJS imports.
 * Takes the combat state and returns what the enemy should do.
 */

import type { Character, Ability, CombatState } from '@game/types';
import { getReachableTiles } from '@game/Grid';
import { gridDistance } from '@utils/iso';

export interface AIDecision {
  type: 'move_and_attack' | 'move_only' | 'attack_only' | 'skip';
  moveTo?: { col: number; row: number };
  ability?: Ability;
  targetCol?: number;
  targetRow?: number;
}

/** Decide what an enemy should do on their turn */
export function decideAction(enemy: Character, state: CombatState): AIDecision {
  const players = state.characters.filter((c) => c.team === 'player' && !c.isDefeated);
  if (players.length === 0) return { type: 'skip' };

  // Find nearest player
  let nearest = players[0];
  let nearestDist = gridDistance(enemy.position, nearest.position);
  for (let i = 1; i < players.length; i++) {
    const d = gridDistance(enemy.position, players[i].position);
    if (d < nearestDist) {
      nearest = players[i];
      nearestDist = d;
    }
  }

  // Pick best ready ability (highest damage, off cooldown)
  const readyAbility = pickBestAbility(enemy);

  // Can attack from current position?
  if (readyAbility && nearestDist <= readyAbility.range) {
    return {
      type: 'attack_only',
      ability: readyAbility,
      targetCol: nearest.position.col,
      targetRow: nearest.position.row,
    };
  }

  // Need to move — find reachable tiles (respect status effect movementMod)
  const effectiveMove = getEffectiveMovement(enemy);
  const reachable = getReachableTiles(state.grid, enemy.position, effectiveMove);
  if (reachable.length === 0) {
    // Can't move; maybe can still attack a different target from here
    if (readyAbility) {
      const inRange = players.find((p) => gridDistance(enemy.position, p.position) <= readyAbility.range);
      if (inRange) {
        return {
          type: 'attack_only',
          ability: readyAbility,
          targetCol: inRange.position.col,
          targetRow: inRange.position.row,
        };
      }
    }
    return { type: 'skip' };
  }

  // Score each reachable tile: prefer tiles that put us in attack range,
  // otherwise minimize distance to nearest player
  let bestTile = reachable[0];
  let bestDist = gridDistance({ col: bestTile.col, row: bestTile.row }, nearest.position);
  let bestCanAttack = readyAbility ? bestDist <= readyAbility.range : false;

  for (let i = 1; i < reachable.length; i++) {
    const tile = reachable[i];
    const d = gridDistance({ col: tile.col, row: tile.row }, nearest.position);
    const canAttack = readyAbility ? d <= readyAbility.range : false;

    // Prefer tiles that enable attacking; among those, prefer closer
    if (canAttack && !bestCanAttack) {
      bestTile = tile;
      bestDist = d;
      bestCanAttack = true;
    } else if (canAttack === bestCanAttack && d < bestDist) {
      bestTile = tile;
      bestDist = d;
      bestCanAttack = canAttack;
    }
  }

  if (bestCanAttack && readyAbility) {
    // Re-find which player is reachable from the new position
    const targetFromNew = players
      .filter((p) => gridDistance({ col: bestTile.col, row: bestTile.row }, p.position) <= readyAbility.range)
      .sort((a, b) => a.currentResolve - b.currentResolve)[0];

    return {
      type: 'move_and_attack',
      moveTo: { col: bestTile.col, row: bestTile.row },
      ability: readyAbility,
      targetCol: targetFromNew.position.col,
      targetRow: targetFromNew.position.row,
    };
  }

  return {
    type: 'move_only',
    moveTo: { col: bestTile.col, row: bestTile.row },
  };
}

/** Get effective movement accounting for status effect movementMod */
function getEffectiveMovement(char: Character): number {
  let mod = 0;
  for (const effect of char.statusEffects) {
    if (effect.movementMod) mod += effect.movementMod;
  }
  return Math.max(0, char.movement + mod);
}

/** Pick the highest-damage ability that is off cooldown */
function pickBestAbility(enemy: Character): Ability | null {
  let best: Ability | null = null;
  for (const ability of enemy.abilities) {
    if (ability.currentCooldown > 0) continue;
    if (!best || ability.resolveDamage > best.resolveDamage) {
      best = ability;
    }
  }
  return best;
}
