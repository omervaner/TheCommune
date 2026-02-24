/**
 * Shared constants used across game logic and rendering.
 */

export const GRID_SIZE = 10;
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const TILE_COLORS = {
  walkable: 0x3a3a5c,
  blocked: 0x1a1a2e,
  move: 0x2a6496,
  attack: 0x964a2a,
  selected: 0xc8b432,
  outline: 0x5a5a8c,
} as const;

export const APP_BACKGROUND = '#1a1a2e';

export const CHAR_RADIUS = 12;
export const CHAR_COLORS = {
  player: 0x4a90d9,
  enemy: 0xd94a4a,
} as const;
export const CHAR_FONT_SIZE = 12;

// Character card styling
export const CARD_COLORS = {
  bg: 0x1e1e36,
  border: 0x5a5a8c,
  shadow: 0x000000,
  divider: 0x3a3a5c,
  text: 0xdddddd,
  textDim: 0x999999,
  namePlayer: 0x6ab4ff,
  nameEnemy: 0xff6a6a,
  abilityReady: 0xdddddd,
  abilityCooldown: 0x666666,
  statLabel: 0x8888aa,
} as const;

export const CARD_SMALL = {
  width: 160,
  padding: 8,
  fontSize: 10,
  nameFontSize: 12,
  offsetX: 30,
  offsetY: -20,
} as const;

export const CARD_LARGE = {
  width: 280,
  padding: 14,
  fontSize: 11,
  nameFontSize: 16,
  abilityFontSize: 10,
} as const;

export const CARD_SHADOW = {
  offsetX: 3,
  offsetY: 3,
  alpha: 0.35,
  radius: 8,
} as const;
