/**
 * Ability button panel displayed during a player's turn.
 * Shows one button per ability, grayed out if on cooldown.
 */

import { Container, Graphics, Text } from 'pixi.js';
import type { Ability, Character } from '@game/types';

const BTN_WIDTH = 220;
const BTN_HEIGHT = 32;
const BTN_GAP = 6;
const BTN_RADIUS = 4;
const BTN_COLOR = 0x4a4a6a;
const BTN_COOLDOWN_COLOR = 0x333344;
const BTN_HOVER_COLOR = 0x5a5a8a;

export class HUD {
  readonly container = new Container();
  private buttons: Container[] = [];
  private onAbilityClick: (ability: Ability) => void;

  constructor(onAbilityClick: (ability: Ability) => void) {
    this.onAbilityClick = onAbilityClick;
  }

  /** Rebuild ability buttons for the current character */
  update(character: Character, hasActed: boolean): void {
    this.clearButtons();

    if (hasActed) {
      this.container.visible = false;
      return;
    }

    for (let i = 0; i < character.abilities.length; i++) {
      const ability = character.abilities[i];
      const btn = this.buildButton(ability);
      btn.y = i * (BTN_HEIGHT + BTN_GAP);
      this.container.addChild(btn);
      this.buttons.push(btn);
    }

    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  show(): void {
    this.container.visible = true;
  }

  /** Position the HUD at a given screen coordinate */
  positionAt(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  private buildButton(ability: Ability): Container {
    const btn = new Container();
    const onCooldown = ability.currentCooldown > 0;

    const bg = new Graphics();
    bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT, BTN_RADIUS);
    bg.fill({ color: onCooldown ? BTN_COOLDOWN_COLOR : BTN_COLOR, alpha: 0.9 });
    bg.stroke({ color: 0x6a6a9a, width: 1 });

    const labelText = onCooldown
      ? `${ability.name} (${ability.currentCooldown})`
      : ability.name;

    const label = new Text({
      text: labelText,
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: onCooldown ? 0x666666 : 0xdddddd,
      },
    });
    label.x = 10;
    label.y = Math.round((BTN_HEIGHT - label.height) / 2);

    btn.addChild(bg, label);

    if (!onCooldown) {
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerover', () => {
        bg.clear();
        bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT, BTN_RADIUS);
        bg.fill({ color: BTN_HOVER_COLOR, alpha: 0.9 });
        bg.stroke({ color: 0x8a8aba, width: 1 });
      });
      btn.on('pointerout', () => {
        bg.clear();
        bg.roundRect(0, 0, BTN_WIDTH, BTN_HEIGHT, BTN_RADIUS);
        bg.fill({ color: BTN_COLOR, alpha: 0.9 });
        bg.stroke({ color: 0x6a6a9a, width: 1 });
      });
      btn.on('pointerdown', () => {
        this.onAbilityClick(ability);
      });
    }

    return btn;
  }

  private clearButtons(): void {
    for (const btn of this.buttons) {
      this.container.removeChild(btn);
      btn.destroy({ children: true });
    }
    this.buttons = [];
  }
}
