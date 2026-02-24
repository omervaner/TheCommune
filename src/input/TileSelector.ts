/**
 * Bridges character/ability selection to grid highlights.
 * Pure logic — no PixiJS imports.
 */

import { getReachableTiles, getTilesInRange, clearHighlights } from '@game/Grid';
import { gridDistance } from '@utils/iso';
import type { Grid, Character, Ability } from '@game/types';

/** Highlight reachable movement tiles for a character and mark their tile as selected.
 *  Uses effectiveMovement if provided (accounts for status effect movementMod). */
export function showReachableTiles(grid: Grid, character: Character, effectiveMovement?: number): void {
  clearHighlights(grid);
  const move = effectiveMovement ?? character.movement;
  const reachable = getReachableTiles(grid, character.position, move);
  for (const tile of reachable) {
    tile.highlight = 'move';
  }
  grid[character.position.col][character.position.row].highlight = 'selected';
}

/** Highlight valid target tiles for an ability */
export function showTargetTiles(grid: Grid, character: Character, ability: Ability): void {
  clearHighlights(grid);
  grid[character.position.col][character.position.row].highlight = 'selected';

  const tilesInRange = getTilesInRange(grid, character.position, ability.range);

  if (ability.targetType === 'single') {
    // Only tiles with an enemy occupant are valid
    for (const tile of tilesInRange) {
      if (tile.occupant && tile.occupant.team !== character.team && !tile.occupant.isDefeated) {
        tile.highlight = 'attack';
      }
    }
  } else if (ability.targetType === 'aoe') {
    // Any tile in range can be the center of the blast
    for (const tile of tilesInRange) {
      tile.highlight = 'attack';
    }
  }
}

/** During AoE hover, show the blast radius around the hovered center tile */
export function showAoeRadius(grid: Grid, character: Character, centerCol: number, centerRow: number, radius: number): void {
  clearHighlights(grid);
  grid[character.position.col][character.position.row].highlight = 'selected';

  const size = grid.length;
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (gridDistance({ col, row }, { col: centerCol, row: centerRow }) <= radius) {
        grid[col][row].highlight = 'attack';
      }
    }
  }
}
