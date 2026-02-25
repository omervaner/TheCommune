/**
 * CommuneState — between-combat state for the management layer.
 * Pure data, no PixiJS imports.
 *
 * C0: minimal — roster, money, morale. Expanded in later milestones.
 */

import type { Character } from '@game/types';

export class CommuneState {
  roster: Character[];
  money: number;
  morale: number;
  day: number;

  constructor(roster: Character[], money = 200, morale = 75) {
    this.roster = roster;
    this.money = money;
    this.morale = morale;
    this.day = 1;
  }

  applyMorale(delta: number): void {
    this.morale = Math.max(0, Math.min(100, this.morale + delta));
  }
}
