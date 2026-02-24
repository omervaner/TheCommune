/**
 * Draws a small resolve bar onto a Graphics object.
 * Supports a "ghost segment" for damage preview — the player sees
 * exactly where the bar will land before committing.
 */

import { Graphics } from 'pixi.js';

const BAR_WIDTH = 28;
const BAR_HEIGHT = 4;
const BAR_BG = 0x222222;
const BAR_GHOST = 0xff6644;

function getFillColor(ratio: number): number {
  if (ratio > 0.6) return 0x44bb44;
  if (ratio > 0.3) return 0xbbbb44;
  return 0xbb4444;
}

export function drawResolveBar(
  g: Graphics,
  currentResolve: number,
  maxResolve: number,
  previewDamage: number = 0,
): void {
  g.clear();

  const ratio = currentResolve / maxResolve;
  const fillWidth = ratio * BAR_WIDTH;

  // Background
  g.roundRect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT, 1);
  g.fill({ color: BAR_BG, alpha: 0.8 });

  if (previewDamage > 0) {
    const newResolve = Math.max(0, currentResolve - previewDamage);
    const newRatio = newResolve / maxResolve;
    const newFillWidth = newRatio * BAR_WIDTH;

    // Ghost segment — the part that would be lost
    if (fillWidth > newFillWidth) {
      g.rect(-BAR_WIDTH / 2 + newFillWidth, 0, fillWidth - newFillWidth, BAR_HEIGHT);
      g.fill({ color: BAR_GHOST, alpha: 0.85 });
    }

    // Remaining fill after damage
    if (newFillWidth > 0) {
      g.rect(-BAR_WIDTH / 2, 0, newFillWidth, BAR_HEIGHT);
      g.fill({ color: getFillColor(newRatio), alpha: 0.9 });
    }
  } else {
    // Normal fill, no preview
    if (fillWidth > 0) {
      g.rect(-BAR_WIDTH / 2, 0, fillWidth, BAR_HEIGHT);
      g.fill({ color: getFillColor(ratio), alpha: 0.9 });
    }
  }
}
