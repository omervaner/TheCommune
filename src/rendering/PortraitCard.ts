/**
 * PortraitCard — dual-mode character card for the dialogue system.
 *
 * Stats mode: portrait + name + class + resolve + traits placeholder.
 * Dialogue mode: portrait fills the card, stats fold away, name bar below.
 *
 * Uses colored rectangles as portrait placeholders until real art is available.
 * Expression changes swap the portrait tint.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';
import { CARD_COLORS, CARD_SHADOW } from '@utils/constants';
import type { Character } from '@game/types';
import type { Expression, CardSlot } from '@dialogue/types';

type PortraitMode = 'stats' | 'dialogue';

const PORTRAIT_W = 200;
const PORTRAIT_H_STATS = 120;
const PORTRAIT_H_DIALOGUE = 220;
const CARD_W = 220;
const CARD_PADDING = 12;
const STATS_FONT = 11;
const NAME_FONT = 16;

const EXPRESSION_TINTS: Record<Expression, number> = {
  neutral: 0xffffff,
  angry: 0xff6666,
  happy: 0x66ff88,
  defeated: 0x8888cc,
};

export class PortraitCard {
  readonly container = new Container();

  private mode: PortraitMode = 'stats';
  private character: Character | null = null;

  private portrait: Graphics | null = null;
  private portraitColor = 0x4a90d9;
  private nameText: Text | null = null;
  private statsContainer: Container | null = null;
  private bgGraphics: Graphics | null = null;
  private shadowGraphics: Graphics | null = null;

  /** Build the card for a character in the given mode */
  build(char: Character, mode: PortraitMode = 'stats'): void {
    this.clear();
    this.character = char;
    this.mode = mode;
    this.portraitColor = char.team === 'player' ? 0x4a90d9 : 0xd94a4a;

    if (mode === 'stats') {
      this.buildStatsMode(char);
    } else {
      this.buildDialogueMode(char);
    }
  }

  /** Transition between stats and dialogue mode with GSAP */
  async setMode(newMode: PortraitMode): Promise<void> {
    if (newMode === this.mode || !this.character) return;

    // Fade out current, rebuild, fade in
    await new Promise<void>((resolve) => {
      gsap.to(this.container, {
        alpha: 0,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: resolve,
      });
    });

    this.build(this.character, newMode);

    await new Promise<void>((resolve) => {
      gsap.to(this.container, {
        alpha: 1,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: resolve,
      });
    });
  }

  /** Swap the portrait expression (tint shift for now, texture swap later) */
  setExpression(expression: Expression): void {
    if (this.portrait) {
      this.portrait.tint = EXPRESSION_TINTS[expression];
    }
  }

  /** Slide the card in from off-screen based on slot side */
  async animateIn(slot: CardSlot, screenWidth: number, screenHeight: number): Promise<void> {
    const targetX = slot === 'left'
      ? Math.round(screenWidth * 0.15)
      : Math.round(screenWidth * 0.85 - CARD_W);
    const targetY = Math.round(screenHeight * 0.5 - this.container.height / 2);

    const startX = slot === 'left' ? -CARD_W - 50 : screenWidth + 50;

    this.container.x = startX;
    this.container.y = targetY;
    this.container.alpha = 0;
    this.container.rotation = slot === 'left' ? -0.05 : 0.05;

    return new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(this.container, {
        x: targetX,
        alpha: 1,
        rotation: 0,
        duration: 0.4,
        ease: 'back.out(1.2)',
      });
    });
  }

  /** Slide the card out and off-screen */
  async animateOut(slot: CardSlot, screenWidth: number): Promise<void> {
    const exitX = slot === 'left' ? -CARD_W - 50 : screenWidth + 50;

    return new Promise<void>((resolve) => {
      gsap.to(this.container, {
        x: exitX,
        alpha: 0,
        rotation: slot === 'left' ? -0.08 : 0.08,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: resolve,
      });
    });
  }

  /** Remove all children and reset state */
  clear(): void {
    this.container.removeChildren();
    this.portrait = null;
    this.nameText = null;
    this.statsContainer = null;
    this.bgGraphics = null;
    this.shadowGraphics = null;
  }

  destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }

  // --- Stats mode ---

  private buildStatsMode(char: Character): void {
    let y = 0;

    // Shadow
    const totalH = this.estimateStatsHeight(char);
    this.shadowGraphics = this.drawRoundedRect(CARD_W + CARD_SHADOW.offsetX, totalH + CARD_SHADOW.offsetY,
      CARD_SHADOW.radius, CARD_COLORS.shadow, CARD_SHADOW.alpha);
    this.shadowGraphics.x = CARD_SHADOW.offsetX;
    this.shadowGraphics.y = CARD_SHADOW.offsetY;
    this.container.addChild(this.shadowGraphics);

    // Background
    this.bgGraphics = new Graphics();
    this.bgGraphics.roundRect(0, 0, CARD_W, totalH, CARD_SHADOW.radius);
    this.bgGraphics.fill({ color: CARD_COLORS.bg, alpha: 0.95 });
    this.bgGraphics.stroke({ color: CARD_COLORS.border, width: 1.5 });
    this.container.addChild(this.bgGraphics);

    // Portrait area
    y += CARD_PADDING;
    this.portrait = new Graphics();
    this.portrait.roundRect(CARD_PADDING, y, PORTRAIT_W, PORTRAIT_H_STATS, 6);
    this.portrait.fill({ color: this.portraitColor, alpha: 0.6 });
    this.portrait.stroke({ color: CARD_COLORS.border, width: 1 });
    this.container.addChild(this.portrait);

    // Portrait label
    const portraitLabel = this.makeText('[ portrait ]', 10, false, CARD_COLORS.textDim);
    portraitLabel.x = CARD_PADDING + PORTRAIT_W / 2 - portraitLabel.width / 2;
    portraitLabel.y = y + PORTRAIT_H_STATS / 2 - 6;
    this.container.addChild(portraitLabel);

    y += PORTRAIT_H_STATS + 8;

    // Name
    const nameColor = char.team === 'player' ? CARD_COLORS.namePlayer : CARD_COLORS.nameEnemy;
    this.nameText = this.makeText(char.name, NAME_FONT, true, nameColor);
    this.nameText.x = CARD_PADDING;
    this.nameText.y = y;
    this.container.addChild(this.nameText);
    y += this.nameText.height + 2;

    // Class
    const classText = this.makeText(this.formatClass(char.class), STATS_FONT, false, CARD_COLORS.textDim);
    classText.x = CARD_PADDING;
    classText.y = y;
    this.container.addChild(classText);
    y += classText.height + 6;

    // Divider
    y = this.addDivider(y);

    // Stats container (holds resolve, move, initiative)
    this.statsContainer = new Container();
    this.statsContainer.y = y;
    let sy = 0;

    const resolveLine = this.makeText(
      `Resolve: ${char.currentResolve}/${char.maxResolve}`,
      STATS_FONT, false, CARD_COLORS.text,
    );
    resolveLine.x = CARD_PADDING;
    resolveLine.y = sy;
    this.statsContainer.addChild(resolveLine);
    sy += resolveLine.height + 4;

    const moveLine = this.makeText(`Move: ${char.movement}`, STATS_FONT, false, CARD_COLORS.text);
    moveLine.x = CARD_PADDING;
    moveLine.y = sy;
    this.statsContainer.addChild(moveLine);

    const initLine = this.makeText(`Initiative: ${char.initiative}`, STATS_FONT, false, CARD_COLORS.text);
    initLine.x = CARD_PADDING + 100;
    initLine.y = sy;
    this.statsContainer.addChild(initLine);
    sy += moveLine.height + 6;

    // Traits placeholder
    const traitLine = this.makeText('Traits: (pending)', STATS_FONT, false, CARD_COLORS.textDim);
    traitLine.x = CARD_PADDING;
    traitLine.y = sy;
    this.statsContainer.addChild(traitLine);

    this.container.addChild(this.statsContainer);
  }

  private estimateStatsHeight(char: Character): number {
    // Portrait + name + class + divider + resolve + move/init + traits + padding
    void char;
    return CARD_PADDING + PORTRAIT_H_STATS + 8 + 20 + 16 + 8 + 18 + 18 + 22 + CARD_PADDING;
  }

  // --- Dialogue mode ---

  private buildDialogueMode(char: Character): void {
    let y = 0;

    const totalH = CARD_PADDING + PORTRAIT_H_DIALOGUE + 8 + 24 + CARD_PADDING;

    // Shadow
    this.shadowGraphics = this.drawRoundedRect(CARD_W + CARD_SHADOW.offsetX, totalH + CARD_SHADOW.offsetY,
      CARD_SHADOW.radius, CARD_COLORS.shadow, CARD_SHADOW.alpha);
    this.shadowGraphics.x = CARD_SHADOW.offsetX;
    this.shadowGraphics.y = CARD_SHADOW.offsetY;
    this.container.addChild(this.shadowGraphics);

    // Background
    this.bgGraphics = new Graphics();
    this.bgGraphics.roundRect(0, 0, CARD_W, totalH, CARD_SHADOW.radius);
    this.bgGraphics.fill({ color: CARD_COLORS.bg, alpha: 0.95 });
    this.bgGraphics.stroke({ color: CARD_COLORS.border, width: 1.5 });
    this.container.addChild(this.bgGraphics);

    // Large portrait area
    y += CARD_PADDING;
    this.portrait = new Graphics();
    this.portrait.roundRect(CARD_PADDING, y, PORTRAIT_W, PORTRAIT_H_DIALOGUE, 6);
    this.portrait.fill({ color: this.portraitColor, alpha: 0.6 });
    this.portrait.stroke({ color: CARD_COLORS.border, width: 1 });
    this.container.addChild(this.portrait);

    // Portrait label
    const portraitLabel = this.makeText('[ portrait ]', 12, false, CARD_COLORS.textDim);
    portraitLabel.x = CARD_PADDING + PORTRAIT_W / 2 - portraitLabel.width / 2;
    portraitLabel.y = y + PORTRAIT_H_DIALOGUE / 2 - 7;
    this.container.addChild(portraitLabel);

    y += PORTRAIT_H_DIALOGUE + 8;

    // Name bar
    const nameColor = char.team === 'player' ? CARD_COLORS.namePlayer : CARD_COLORS.nameEnemy;
    this.nameText = this.makeText(char.name, NAME_FONT, true, nameColor);
    this.nameText.x = CARD_PADDING;
    this.nameText.y = y;
    this.container.addChild(this.nameText);
  }

  // --- Helpers ---

  private makeText(content: string, size: number, bold: boolean, color: number): Text {
    return new Text({
      text: content,
      style: {
        fontFamily: 'monospace',
        fontSize: size,
        fontWeight: bold ? 'bold' : 'normal',
        fill: color,
      },
    });
  }

  private drawRoundedRect(width: number, height: number, radius: number, color: number, alpha: number): Graphics {
    const g = new Graphics();
    g.roundRect(0, 0, width, height, radius);
    g.fill({ color, alpha });
    return g;
  }

  private addDivider(y: number): number {
    const line = new Graphics();
    line.moveTo(CARD_PADDING, y);
    line.lineTo(CARD_W - CARD_PADDING, y);
    line.stroke({ color: CARD_COLORS.divider, width: 1, alpha: 0.6 });
    this.container.addChild(line);
    return y + 8;
  }

  private formatClass(cls: string): string {
    return cls.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
}
