/**
 * Floating character info card with two modes:
 *  - Small hover card: name, class, resolve, status effects
 *  - Large select card: full stats, abilities, effects
 * Both flip in/out via scaleX animation.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { drawResolveBar } from '@rendering/ResolveBar';
import { tweenCardFlipIn, tweenCardFlipOut } from '@animation/Tweens';
import {
  CARD_COLORS,
  CARD_SMALL,
  CARD_LARGE,
  CARD_SHADOW,
} from '@utils/constants';
import type { Character } from '@game/types';

type CardMode = 'small' | 'large';

export class CharacterCard {
  readonly container = new Container();
  private currentCard: Container | null = null;
  private currentMode: CardMode | null = null;
  private currentCharId: string | null = null;
  private flipOutInProgress = false;

  /** Show a small hover card near a character's screen position */
  showSmall(char: Character, screenX: number, screenY: number, stageWidth: number, stageHeight: number): void {
    if (this.currentMode === 'small' && this.currentCharId === char.id) return;
    this.hideImmediate();

    const card = this.buildSmallCard(char);
    this.positionSmallCard(card, screenX, screenY, stageWidth, stageHeight);
    this.container.addChild(card);
    this.currentCard = card;
    this.currentMode = 'small';
    this.currentCharId = char.id;

    tweenCardFlipIn(card);
  }

  /** Show a large centered card for a character */
  showLarge(char: Character, stageWidth: number, stageHeight: number): void {
    if (this.currentMode === 'large' && this.currentCharId === char.id) return;
    this.hideImmediate();

    const card = this.buildLargeCard(char);
    // Upper-right corner, 20px padding from edges
    card.x = Math.round(stageWidth - CARD_LARGE.width - 20);
    card.y = 20;
    // Pivot at horizontal center for flip
    card.pivot.x = CARD_LARGE.width / 2;
    card.x += CARD_LARGE.width / 2;

    this.container.addChild(card);
    this.currentCard = card;
    this.currentMode = 'large';
    this.currentCharId = char.id;

    tweenCardFlipIn(card);
  }

  /** Animate the card out, then destroy it */
  async hide(): Promise<void> {
    if (!this.currentCard || this.flipOutInProgress) return;
    this.flipOutInProgress = true;
    const card = this.currentCard;
    await tweenCardFlipOut(card);
    this.destroyCard(card);
    if (this.currentCard === card) {
      this.currentCard = null;
      this.currentMode = null;
      this.currentCharId = null;
    }
    this.flipOutInProgress = false;
  }

  /** Immediately remove card without animation */
  hideImmediate(): void {
    if (!this.currentCard) return;
    this.destroyCard(this.currentCard);
    this.currentCard = null;
    this.currentMode = null;
    this.currentCharId = null;
    this.flipOutInProgress = false;
  }

  get isShowingLarge(): boolean {
    return this.currentMode === 'large';
  }

  get isShowing(): boolean {
    return this.currentCard !== null;
  }

  get shownCharacterId(): string | null {
    return this.currentCharId;
  }

  // --- Small card ---

  private buildSmallCard(char: Character): Container {
    const card = new Container();
    const p = CARD_SMALL;
    let y = p.padding;

    // Content first to measure height
    const nameText = this.makeText(char.name, p.nameFontSize, true,
      char.team === 'player' ? CARD_COLORS.namePlayer : CARD_COLORS.nameEnemy);
    nameText.x = p.padding;
    nameText.y = y;
    card.addChild(nameText);
    y += nameText.height + 2;

    const classText = this.makeText(this.formatClass(char.class), p.fontSize, false, CARD_COLORS.textDim);
    classText.x = p.padding;
    classText.y = y;
    card.addChild(classText);
    y += classText.height + 6;

    // Resolve bar + text
    const resolveBar = new Graphics();
    resolveBar.x = p.padding;
    resolveBar.y = y + 2;
    drawResolveBar(resolveBar, char.currentResolve, char.maxResolve);
    // Shift bar since drawResolveBar centers at x=0
    resolveBar.x = p.padding + 14;
    card.addChild(resolveBar);

    const resolveText = this.makeText(
      `${char.currentResolve}/${char.maxResolve}`,
      p.fontSize, false, CARD_COLORS.text,
    );
    resolveText.x = p.padding + 34;
    resolveText.y = y;
    card.addChild(resolveText);
    y += resolveText.height + 4;

    // Status effects
    if (char.statusEffects.length > 0) {
      for (const effect of char.statusEffects) {
        const effectText = this.makeText(
          `${effect.name} (${effect.duration})`,
          p.fontSize, false, 0xffaa44,
        );
        effectText.x = p.padding;
        effectText.y = y;
        card.addChild(effectText);
        y += effectText.height + 2;
      }
    }

    y += p.padding;
    const totalHeight = y;

    // Background + shadow (drawn behind content)
    const shadow = this.drawRoundedRect(p.width + CARD_SHADOW.offsetX, totalHeight + CARD_SHADOW.offsetY,
      CARD_SHADOW.radius, CARD_COLORS.shadow, CARD_SHADOW.alpha);
    shadow.x = CARD_SHADOW.offsetX;
    shadow.y = CARD_SHADOW.offsetY;
    card.addChildAt(shadow, 0);

    const bg = this.drawCardBg(p.width, totalHeight);
    card.addChildAt(bg, 1);

    // Pivot at left center for flip
    card.pivot.x = 0;

    return card;
  }

  private positionSmallCard(
    card: Container, screenX: number, screenY: number,
    stageWidth: number, stageHeight: number,
  ): void {
    let x = screenX + CARD_SMALL.offsetX;
    let y = screenY + CARD_SMALL.offsetY;

    // Clamp to screen bounds
    if (x + CARD_SMALL.width + 10 > stageWidth) {
      x = screenX - CARD_SMALL.width - CARD_SMALL.offsetX;
    }
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    if (y + card.height + 10 > stageHeight) {
      y = stageHeight - card.height - 10;
    }

    card.x = Math.round(x);
    card.y = Math.round(y);
  }

  // --- Large card ---

  private buildLargeCard(char: Character): Container {
    const card = new Container();
    const p = CARD_LARGE;
    let y: number = p.padding;

    // Name
    const nameText = this.makeText(char.name, p.nameFontSize, true,
      char.team === 'player' ? CARD_COLORS.namePlayer : CARD_COLORS.nameEnemy);
    nameText.x = p.padding;
    nameText.y = y;
    card.addChild(nameText);
    y += nameText.height + 2;

    // Class
    const classText = this.makeText(this.formatClass(char.class), p.fontSize, false, CARD_COLORS.textDim);
    classText.x = p.padding;
    classText.y = y;
    card.addChild(classText);
    y += classText.height + 8;

    // Divider
    y = this.addDivider(card, y, p.width, p.padding);

    // Resolve
    const resolveLabel = this.makeText('Resolve', p.fontSize, false, CARD_COLORS.statLabel);
    resolveLabel.x = p.padding;
    resolveLabel.y = y;
    card.addChild(resolveLabel);

    const resolveBar = new Graphics();
    resolveBar.x = p.padding + 60;
    resolveBar.y = y + 3;
    drawResolveBar(resolveBar, char.currentResolve, char.maxResolve);
    card.addChild(resolveBar);

    const resolveVal = this.makeText(
      `${char.currentResolve}/${char.maxResolve}`,
      p.fontSize, false, CARD_COLORS.text,
    );
    resolveVal.x = p.padding + 96;
    resolveVal.y = y;
    card.addChild(resolveVal);
    y += resolveVal.height + 6;

    // Movement + Initiative on same row
    const moveText = this.makeText(`Move: ${char.movement}`, p.fontSize, false, CARD_COLORS.text);
    moveText.x = p.padding;
    moveText.y = y;
    card.addChild(moveText);

    const initText = this.makeText(`Initiative: ${char.initiative}`, p.fontSize, false, CARD_COLORS.text);
    initText.x = p.padding + 100;
    initText.y = y;
    card.addChild(initText);
    y += moveText.height + 8;

    // Divider
    y = this.addDivider(card, y, p.width, p.padding);

    // Abilities header
    const abilHeader = this.makeText('Abilities', p.fontSize, true, CARD_COLORS.statLabel);
    abilHeader.x = p.padding;
    abilHeader.y = y;
    card.addChild(abilHeader);
    y += abilHeader.height + 4;

    for (const ability of char.abilities) {
      const onCooldown = ability.currentCooldown > 0;
      const color = onCooldown ? CARD_COLORS.abilityCooldown : CARD_COLORS.abilityReady;

      const abilName = this.makeText(ability.name, p.abilityFontSize, true, color);
      abilName.x = p.padding + 6;
      abilName.y = y;
      card.addChild(abilName);
      y += abilName.height + 1;

      const cdStr = onCooldown ? `CD: ${ability.currentCooldown}` : 'Ready';
      const rangeStr = ability.targetType === 'aoe'
        ? `Range ${ability.range} | AoE ${ability.aoeRadius}`
        : `Range ${ability.range}`;
      const detailStr = `DMG ${ability.resolveDamage} | ${rangeStr} | ${cdStr}`;

      const detail = this.makeText(detailStr, p.abilityFontSize, false, CARD_COLORS.textDim);
      detail.x = p.padding + 6;
      detail.y = y;
      card.addChild(detail);
      y += detail.height + 6;
    }

    // Status effects
    if (char.statusEffects.length > 0) {
      y = this.addDivider(card, y, p.width, p.padding);

      const statusHeader = this.makeText('Status', p.fontSize, true, CARD_COLORS.statLabel);
      statusHeader.x = p.padding;
      statusHeader.y = y;
      card.addChild(statusHeader);
      y += statusHeader.height + 4;

      for (const effect of char.statusEffects) {
        const effectText = this.makeText(
          `${effect.name} — ${effect.duration} turn${effect.duration !== 1 ? 's' : ''}`,
          p.abilityFontSize, false, 0xffaa44,
        );
        effectText.x = p.padding + 6;
        effectText.y = y;
        card.addChild(effectText);
        y += effectText.height + 3;
      }
    }

    y += p.padding;
    const totalHeight = y;

    // Shadow + background
    const shadow = this.drawRoundedRect(p.width + CARD_SHADOW.offsetX, totalHeight + CARD_SHADOW.offsetY,
      CARD_SHADOW.radius, CARD_COLORS.shadow, CARD_SHADOW.alpha);
    shadow.x = CARD_SHADOW.offsetX;
    shadow.y = CARD_SHADOW.offsetY;
    card.addChildAt(shadow, 0);

    const bg = this.drawCardBg(p.width, totalHeight);
    card.addChildAt(bg, 1);

    return card;
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

  private drawCardBg(width: number, height: number): Graphics {
    const g = new Graphics();
    g.roundRect(0, 0, width, height, CARD_SHADOW.radius);
    g.fill({ color: CARD_COLORS.bg, alpha: 0.95 });
    g.stroke({ color: CARD_COLORS.border, width: 1.5 });
    return g;
  }

  private drawRoundedRect(width: number, height: number, radius: number, color: number, alpha: number): Graphics {
    const g = new Graphics();
    g.roundRect(0, 0, width, height, radius);
    g.fill({ color, alpha });
    return g;
  }

  private addDivider(card: Container, y: number, cardWidth: number, padding: number): number {
    const line = new Graphics();
    line.moveTo(padding, y);
    line.lineTo(cardWidth - padding, y);
    line.stroke({ color: CARD_COLORS.divider, width: 1, alpha: 0.6 });
    card.addChild(line);
    return y + 8;
  }

  private formatClass(cls: string): string {
    return cls.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  private destroyCard(card: Container): void {
    this.container.removeChild(card);
    card.destroy({ children: true });
  }
}
