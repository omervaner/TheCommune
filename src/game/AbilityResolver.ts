/**
 * Calculates and applies ability effects.
 * Provides both a preview (read-only) and execute (mutates state) path
 * so the UI can show expected outcomes before the player commits.
 * Pure data module: no PixiJS imports.
 */

import type { Ability, Character, Grid, CombatEvents } from '@game/types';
import type { EventBus } from '../EventBus';
import { getTile } from '@game/Grid';
import { gridDistance } from '@utils/iso';

export interface AbilityPreviewEntry {
  character: Character;
  damage: number;
  newResolve: number;
  wouldDefeat: boolean;
}

/** Find which characters an ability would hit */
function getTargets(
  ability: Ability,
  attacker: Character,
  targetCol: number,
  targetRow: number,
  grid: Grid,
  characters: Character[],
): Character[] {
  if (ability.targetType === 'single') {
    const tile = getTile(grid, targetCol, targetRow);
    if (tile?.occupant && !tile.occupant.isDefeated && tile.occupant.team !== attacker.team) {
      return [tile.occupant];
    }
    return [];
  }

  if (ability.targetType === 'aoe') {
    const radius = ability.aoeRadius ?? 0;
    return characters.filter((c) => {
      if (c.isDefeated || c.team === attacker.team) return false;
      return gridDistance(c.position, { col: targetCol, row: targetRow }) <= radius;
    });
  }

  return [];
}

function buildPreview(ability: Ability, targets: Character[]): AbilityPreviewEntry[] {
  return targets.map((char) => {
    const damage = ability.resolveDamage;
    const newResolve = Math.max(0, char.currentResolve - damage);
    return {
      character: char,
      damage,
      newResolve,
      wouldDefeat: newResolve <= 0,
    };
  });
}

/** Calculate what would happen without changing any state */
export function previewAbility(
  ability: Ability,
  attacker: Character,
  targetCol: number,
  targetRow: number,
  grid: Grid,
  characters: Character[],
): AbilityPreviewEntry[] {
  const targets = getTargets(ability, attacker, targetCol, targetRow, grid, characters);
  return buildPreview(ability, targets);
}

/** Apply the ability: reduce resolve, set cooldown, apply status effects */
export function executeAbility(
  ability: Ability,
  attacker: Character,
  targetCol: number,
  targetRow: number,
  grid: Grid,
  characters: Character[],
  bus?: EventBus<CombatEvents>,
): AbilityPreviewEntry[] {
  const targets = getTargets(ability, attacker, targetCol, targetRow, grid, characters);
  const preview = buildPreview(ability, targets);

  for (const entry of preview) {
    entry.character.currentResolve = entry.newResolve;

    if (ability.effects) {
      for (const effect of ability.effects) {
        const applied = { ...effect };
        entry.character.statusEffects.push(applied);
        bus?.emit('statusEffectApplied', entry.character, applied);
      }
    }
  }

  ability.currentCooldown = ability.cooldown;

  return preview;
}
