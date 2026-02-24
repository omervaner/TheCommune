/**
 * Isometric coordinate conversion utilities.
 *
 * Grid coordinates (col, row) are the logical position on the 10x10 grid.
 * Screen coordinates (x, y) are pixel positions on the canvas.
 *
 * Standard isometric projection:
 *   screenX = (col - row) * tileWidth / 2
 *   screenY = (col + row) * tileHeight / 2
 */

import { TILE_WIDTH, TILE_HEIGHT } from '@utils/constants';
export { TILE_WIDTH, TILE_HEIGHT };

export interface GridPosition {
  col: number;
  row: number;
}

export interface ScreenPosition {
  x: number;
  y: number;
}

/** Convert grid (col, row) to screen pixel position */
export function gridToScreen(col: number, row: number): ScreenPosition {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

/** Convert screen pixel position back to grid (col, row) */
export function screenToGrid(x: number, y: number): GridPosition {
  return {
    col: Math.round(x / TILE_WIDTH + y / TILE_HEIGHT),
    row: Math.round(y / TILE_HEIGHT - x / TILE_WIDTH),
  };
}

/** Check if a grid position is within the 10x10 bounds */
export function isValidTile(col: number, row: number, gridSize: number = 10): boolean {
  return col >= 0 && col < gridSize && row >= 0 && row < gridSize;
}

/** Get Manhattan distance between two grid positions */
export function gridDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
