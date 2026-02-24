/**
 * Draws characters on the isometric grid.
 * Uses sprite textures when available, falls back to colored circles with letter labels.
 * Includes resolve bars, damage preview labels, and idle bob animation.
 *
 * Each sprite has a wrapper (positioned by gridToScreen) and an inner body
 * (idle bob target). This keeps grid positioning and idle animation independent
 * so action animations on the wrapper don't conflict with the bob.
 */

import { Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import { gridToScreen } from '@utils/iso';
import { CHAR_RADIUS, CHAR_COLORS, CHAR_FONT_SIZE } from '@utils/constants';
import { drawResolveBar } from '@rendering/ResolveBar';
import { tweenIdle } from '@animation/Tweens';
import type { Character } from '@game/types';

/** Map character class to sprite folder path under /sprites/ */
const SPRITE_PATHS: Partial<Record<string, string>> = {
  karen: '/sprites/karen/rotations/south-east.png',
};

/** Colors for known status effects; unknown effects get a default gray */
const STATUS_COLORS: Record<string, number> = {
  self_doubt: 0x9966cc,
};
const STATUS_DEFAULT_COLOR = 0x888888;

interface CharacterSpriteData {
  container: Container;
  body: Container;
  visual: Graphics | Sprite;
  label: Text;
  resolveBar: Graphics;
  previewLabel: Text;
  statusContainer: Container;
  character: Character;
  idleTween: gsap.core.Tween | null;
}

export class CharacterRenderer {
  readonly container = new Container();
  private sprites = new Map<string, CharacterSpriteData>();
  private previews = new Map<string, number>();

  /** Preload all sprite textures so they're ready for sync createSprite */
  async preload(): Promise<void> {
    const paths = new Set(Object.values(SPRITE_PATHS));
    const loads = [...paths].map((path) => Assets.load(path!).catch(() => null));
    await Promise.all(loads);
  }

  /** Rebuild all character visuals from current state */
  update(characters: Character[]): void {
    for (const [id, sprite] of this.sprites) {
      const char = characters.find((c) => c.id === id);
      if (!char || char.isDefeated) {
        sprite.idleTween?.kill();
        this.container.removeChild(sprite.container);
        sprite.container.destroy({ children: true });
        this.sprites.delete(id);
        this.previews.delete(id);
      }
    }

    for (const char of characters) {
      if (char.isDefeated) continue;

      let sprite = this.sprites.get(char.id);
      if (!sprite) {
        sprite = this.createSprite(char);
        this.sprites.set(char.id, sprite);
        this.container.addChild(sprite.container);
      }

      sprite.character = char;

      const screen = gridToScreen(char.position.col, char.position.row);
      sprite.container.x = screen.x;
      sprite.container.y = screen.y;

      const previewDmg = this.previews.get(char.id) ?? 0;
      drawResolveBar(sprite.resolveBar, char.currentResolve, char.maxResolve, previewDmg);
      this.updateStatusIcons(sprite);
    }
  }

  /** Get the outer wrapper container for a character (for action animations) */
  getSprite(characterId: string): Container | null {
    return this.sprites.get(characterId)?.container ?? null;
  }

  /** Kill idle bob, reset body.y to 0 so action animations start from base */
  pauseIdle(characterId: string): void {
    const sprite = this.sprites.get(characterId);
    if (!sprite) return;
    sprite.idleTween?.kill();
    sprite.idleTween = null;
    sprite.body.y = 0;
  }

  /** Restart idle bob from base position */
  resumeIdle(characterId: string): void {
    const sprite = this.sprites.get(characterId);
    if (!sprite) return;
    sprite.idleTween?.kill();
    sprite.body.y = 0;
    sprite.idleTween = tweenIdle(sprite.body);
  }

  /** Show a damage preview on a specific character */
  setPreview(characterId: string, damage: number, wouldDefeat: boolean): void {
    const sprite = this.sprites.get(characterId);
    if (!sprite) return;

    this.previews.set(characterId, damage);
    drawResolveBar(sprite.resolveBar, sprite.character.currentResolve, sprite.character.maxResolve, damage);

    sprite.previewLabel.text = wouldDefeat ? `−${damage} KO` : `−${damage}`;
    sprite.previewLabel.style.fill = wouldDefeat ? 0xff4444 : 0xff9944;
    sprite.previewLabel.visible = true;
  }

  /** Clear all damage previews */
  clearAllPreviews(): void {
    for (const [id, sprite] of this.sprites) {
      if (this.previews.has(id)) {
        drawResolveBar(sprite.resolveBar, sprite.character.currentResolve, sprite.character.maxResolve);
      }
      sprite.previewLabel.visible = false;
    }
    this.previews.clear();
  }

  private createSprite(char: Character): CharacterSpriteData {
    const wrapper = new Container();
    const body = new Container();

    const spritePath = SPRITE_PATHS[char.class];
    const texture = spritePath ? Assets.get(spritePath) : null;

    let visual: Graphics | Sprite;
    let visualHeight: number;

    if (texture) {
      const spr = new Sprite(texture);
      spr.anchor.set(0.5, 0.8);
      visual = spr;
      visualHeight = spr.height;
    } else {
      const fill = char.team === 'player' ? CHAR_COLORS.player : CHAR_COLORS.enemy;
      const circle = new Graphics();
      circle.circle(0, 0, CHAR_RADIUS);
      circle.fill({ color: fill, alpha: 0.9 });
      circle.stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
      visual = circle;
      visualHeight = CHAR_RADIUS * 2;
    }

    const letter = char.name[0].toUpperCase();
    const label = new Text({
      text: letter,
      style: {
        fontFamily: 'monospace',
        fontSize: CHAR_FONT_SIZE,
        fontWeight: 'bold',
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5, 0.5);
    // Hide letter label when using a real sprite
    if (texture) label.visible = false;

    const barY = texture ? -(visualHeight * 0.8) - 4 : -CHAR_RADIUS - 8;

    const resolveBar = new Graphics();
    resolveBar.y = barY;

    const previewLabel = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 'bold',
        fill: 0xff9944,
      },
    });
    previewLabel.anchor.set(0.5, 1);
    previewLabel.x = 0;
    previewLabel.y = barY - 4;
    previewLabel.visible = false;

    const statusContainer = new Container();
    statusContainer.y = barY - 16;

    body.addChild(visual);
    body.addChild(label);
    body.addChild(resolveBar);
    body.addChild(previewLabel);
    body.addChild(statusContainer);
    wrapper.addChild(body);

    const idleTween = tweenIdle(body);

    return { container: wrapper, body, visual, label, resolveBar, previewLabel, statusContainer, character: char, idleTween };
  }

  /** Redraw status effect icons for a character */
  private updateStatusIcons(sprite: CharacterSpriteData): void {
    const sc = sprite.statusContainer;
    sc.removeChildren();

    const effects = sprite.character.statusEffects;
    if (effects.length === 0) return;

    const iconSize = 10;
    const gap = 2;
    const totalWidth = effects.length * iconSize + (effects.length - 1) * gap;
    let x = -totalWidth / 2 + iconSize / 2;

    for (const effect of effects) {
      const color = STATUS_COLORS[effect.id] ?? STATUS_DEFAULT_COLOR;

      const icon = new Graphics();
      icon.roundRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 2);
      icon.fill({ color, alpha: 0.9 });
      icon.stroke({ color: 0xffffff, width: 0.5, alpha: 0.6 });
      icon.x = x;

      const dur = new Text({
        text: `${effect.duration}`,
        style: {
          fontFamily: 'monospace',
          fontSize: 7,
          fontWeight: 'bold',
          fill: 0xffffff,
        },
      });
      dur.anchor.set(0.5, 0.5);
      dur.x = x;

      sc.addChild(icon);
      sc.addChild(dur);
      x += iconSize + gap;
    }
  }
}
