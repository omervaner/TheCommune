/**
 * Horizontal turn-order display at the top of the screen.
 * Shows one slot per character, highlights the current turn.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { CHAR_COLORS } from '@utils/constants';
import type { Character } from '@game/types';

const SLOT_SIZE = 36;
const SLOT_GAP = 6;
const SLOT_RADIUS = 6;
const TOP_MARGIN = 16;
const FONT_SIZE = 14;
const HIGHLIGHT_COLOR = 0xf0c040;

interface Slot {
  container: Container;
  bg: Graphics;
  character: Character;
}

export class InitiativeBar {
  readonly container = new Container();
  private slots: Slot[] = [];

  /** Rebuild bar for the given turn order, highlight currentIndex */
  update(turnOrder: Character[], currentIndex: number): void {
    // Tear down previous slots
    for (const slot of this.slots) {
      this.container.removeChild(slot.container);
      slot.container.destroy({ children: true });
    }
    this.slots = [];

    for (let i = 0; i < turnOrder.length; i++) {
      const char = turnOrder[i];
      const isCurrent = i === currentIndex;
      const slot = this.buildSlot(char, isCurrent);
      slot.container.x = i * (SLOT_SIZE + SLOT_GAP);
      slot.container.y = 0;
      this.container.addChild(slot.container);
      this.slots.push(slot);
    }
  }

  /** Center the bar horizontally at the top of the screen */
  centerOn(screenWidth: number): void {
    const totalWidth = this.slots.length * SLOT_SIZE + (this.slots.length - 1) * SLOT_GAP;
    this.container.x = Math.round((screenWidth - totalWidth) / 2);
    this.container.y = TOP_MARGIN;
  }

  private buildSlot(char: Character, isCurrent: boolean): Slot {
    const wrapper = new Container();

    const bg = new Graphics();
    const fill = char.team === 'player' ? CHAR_COLORS.player : CHAR_COLORS.enemy;
    const strokeColor = isCurrent ? HIGHLIGHT_COLOR : 0x5a5a8c;
    const strokeWidth = isCurrent ? 3 : 1;

    bg.roundRect(0, 0, SLOT_SIZE, SLOT_SIZE, SLOT_RADIUS);
    bg.fill({ color: fill, alpha: isCurrent ? 1.0 : 0.5 });
    bg.stroke({ color: strokeColor, width: strokeWidth });

    const label = new Text({
      text: char.name[0].toUpperCase(),
      style: {
        fontFamily: 'monospace',
        fontSize: FONT_SIZE,
        fontWeight: 'bold',
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5, 0.5);
    label.x = SLOT_SIZE / 2;
    label.y = SLOT_SIZE / 2;

    wrapper.addChild(bg);
    wrapper.addChild(label);

    return { container: wrapper, bg, character: char };
  }
}
