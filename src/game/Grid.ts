/**
 * Grid data operations — creating the grid, querying tiles, pathfinding.
 * Pure data module: no PixiJS imports.
 */

import type { Grid, Tile } from '@game/types';
import type { GridPosition } from '@utils/iso';
import { isValidTile, gridDistance } from '@utils/iso';
import { GRID_SIZE } from '@utils/constants';

/** Create a fresh 10x10 grid of walkable tiles */
export function createGrid(size: number = GRID_SIZE): Grid {
  const grid: Grid = [];
  for (let col = 0; col < size; col++) {
    grid[col] = [];
    for (let row = 0; row < size; row++) {
      grid[col][row] = {
        col,
        row,
        walkable: true,
        highlight: 'none',
      };
    }
  }
  return grid;
}

/** Get a tile from the grid, or undefined if out of bounds */
export function getTile(grid: Grid, col: number, row: number): Tile | undefined {
  if (!isValidTile(col, row, grid.length)) return undefined;
  return grid[col][row];
}

/** BFS to find all reachable tiles within a movement range */
export function getReachableTiles(grid: Grid, start: GridPosition, range: number): Tile[] {
  const reachable: Tile[] = [];
  const visited = new Set<string>();
  const queue: Array<{ col: number; row: number; dist: number }> = [
    { col: start.col, row: start.row, dist: 0 },
  ];
  visited.add(`${start.col},${start.row}`);

  const directions = [
    { col: 0, row: -1 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
    { col: 1, row: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.dist > 0) {
      const tile = getTile(grid, current.col, current.row);
      if (tile) reachable.push(tile);
    }

    if (current.dist >= range) continue;

    for (const dir of directions) {
      const nextCol = current.col + dir.col;
      const nextRow = current.row + dir.row;
      const key = `${nextCol},${nextRow}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = getTile(grid, nextCol, nextRow);
      if (!tile || !tile.walkable || tile.occupant) continue;

      queue.push({ col: nextCol, row: nextRow, dist: current.dist + 1 });
    }
  }

  return reachable;
}

/** Get all tiles within a range (for ability targeting — ignores obstacles) */
export function getTilesInRange(grid: Grid, center: GridPosition, range: number): Tile[] {
  const tiles: Tile[] = [];
  const size = grid.length;

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (col === center.col && row === center.row) continue;
      if (gridDistance(center, { col, row }) <= range) {
        tiles.push(grid[col][row]);
      }
    }
  }

  return tiles;
}

/** Clear all tile highlights */
export function clearHighlights(grid: Grid): void {
  for (const col of grid) {
    for (const tile of col) {
      tile.highlight = 'none';
    }
  }
}
