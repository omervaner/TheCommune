/**
 * Translates pointer events on the canvas into grid-space events.
 * Accounts for the grid container's screen offset so screenToGrid
 * receives coordinates relative to the grid origin, not raw canvas coords.
 */

import type { Application, FederatedPointerEvent } from 'pixi.js';
import type { Container } from 'pixi.js';
import { screenToGrid, isValidTile } from '@utils/iso';
import type { EventBus } from '../EventBus';
import type { CombatEvents } from '@game/types';

export class InputHandler {
  private app: Application;
  private gridContainer: Container;
  private bus: EventBus<CombatEvents>;
  private lastHoveredCol = -1;
  private lastHoveredRow = -1;

  constructor(app: Application, gridContainer: Container, bus: EventBus<CombatEvents>) {
    this.app = app;
    this.gridContainer = gridContainer;
    this.bus = bus;

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', this.onPointerDown);
    this.app.stage.on('pointermove', this.onPointerMove);
  }

  private onPointerDown = (e: FederatedPointerEvent): void => {
    const localX = e.global.x - this.gridContainer.x;
    const localY = e.global.y - this.gridContainer.y;
    const { col, row } = screenToGrid(localX, localY);

    if (isValidTile(col, row)) {
      this.bus.emit('tileClicked', col, row);
    } else {
      this.bus.emit('stageClicked');
    }
  };

  private onPointerMove = (e: FederatedPointerEvent): void => {
    const localX = e.global.x - this.gridContainer.x;
    const localY = e.global.y - this.gridContainer.y;
    const { col, row } = screenToGrid(localX, localY);

    if (col === this.lastHoveredCol && row === this.lastHoveredRow) return;
    this.lastHoveredCol = col;
    this.lastHoveredRow = row;

    // Emit for all positions — scene decides whether to act on invalid tiles
    this.bus.emit('tileHovered', col, row);
  };

  destroy(): void {
    this.app.stage.off('pointerdown', this.onPointerDown);
    this.app.stage.off('pointermove', this.onPointerMove);
  }
}
