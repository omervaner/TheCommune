/**
 * Draws the isometric grid using PixiJS Graphics.
 * Reads grid state from CombatEngine but never mutates it.
 */

import { Container, Graphics } from 'pixi.js';
import { gridToScreen } from '@utils/iso';
import { TILE_WIDTH, TILE_HEIGHT, GRID_SIZE, TILE_COLORS } from '@utils/constants';
import type { Grid, Tile } from '@game/types';

export class GridRenderer {
  readonly container: Container;
  private tileGraphics: Graphics[][] = [];
  private gridSize: number;

  constructor(gridSize: number = GRID_SIZE) {
    this.container = new Container();
    this.gridSize = gridSize;
    this.buildTiles();
  }

  /** Create all tile diamond graphics upfront */
  private buildTiles(): void {
    for (let col = 0; col < this.gridSize; col++) {
      this.tileGraphics[col] = [];
      for (let row = 0; row < this.gridSize; row++) {
        const tile = new Graphics();
        const screen = gridToScreen(col, row);

        this.drawDiamond(tile, 0, 0, TILE_COLORS.walkable, TILE_COLORS.outline);

        tile.x = screen.x;
        tile.y = screen.y;

        this.container.addChild(tile);
        this.tileGraphics[col][row] = tile;
      }
    }
  }

  /** Draw a diamond (isometric tile) shape */
  private drawDiamond(
    g: Graphics,
    cx: number,
    cy: number,
    fill: number,
    stroke: number,
  ): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    g.clear();
    g.poly([
      cx,      cy - hh,  // top
      cx + hw, cy,       // right
      cx,      cy + hh,  // bottom
      cx - hw, cy,       // left
    ]);
    g.fill({ color: fill, alpha: 0.8 });
    g.stroke({ color: stroke, width: 1, alpha: 0.6 });
  }

  /** Update tile visuals to match current grid state */
  update(grid: Grid): void {
    for (let col = 0; col < this.gridSize; col++) {
      for (let row = 0; row < this.gridSize; row++) {
        const tile = grid[col][row];
        const gfx = this.tileGraphics[col][row];
        const fill = this.getFillColor(tile);
        this.drawDiamond(gfx, 0, 0, fill, TILE_COLORS.outline);
      }
    }
  }

  /** Center the grid container within the given screen dimensions */
  centerOn(screenWidth: number, screenHeight: number): void {
    const topLeft = gridToScreen(0, 0);
    const topRight = gridToScreen(this.gridSize - 1, 0);
    const bottomLeft = gridToScreen(0, this.gridSize - 1);
    const bottomRight = gridToScreen(this.gridSize - 1, this.gridSize - 1);

    const minX = bottomLeft.x - TILE_WIDTH / 2;
    const maxX = topRight.x + TILE_WIDTH / 2;
    const minY = topLeft.y - TILE_HEIGHT / 2;
    const maxY = bottomRight.y + TILE_HEIGHT / 2;

    const gridCenterX = (minX + maxX) / 2;
    const gridCenterY = (minY + maxY) / 2;

    this.container.x = screenWidth / 2 - gridCenterX;
    this.container.y = screenHeight / 2 - gridCenterY;
  }

  private getFillColor(tile: Tile): number {
    if (!tile.walkable) return TILE_COLORS.blocked;
    switch (tile.highlight) {
      case 'move': return TILE_COLORS.move;
      case 'attack': return TILE_COLORS.attack;
      case 'selected': return TILE_COLORS.selected;
      default: return TILE_COLORS.walkable;
    }
  }
}
