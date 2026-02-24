/**
 * Centralized sound playback via Howler.js.
 * Subscribes to EventBus events and plays appropriate sounds.
 *
 * Sound files go in public/audio/. To swap placeholder sounds for real ones,
 * just replace the files — no code changes needed.
 */

import { Howl } from 'howler';
import type { EventBus } from '../EventBus';
import type { CombatEvents } from '@game/types';

type SoundId = 'hit' | 'defeat' | 'turnStart' | 'select' | 'victory';

const SOUND_PATHS: Record<SoundId, string> = {
  hit: '/audio/hit.wav',
  defeat: '/audio/defeat.wav',
  turnStart: '/audio/turn-start.wav',
  select: '/audio/select.wav',
  victory: '/audio/victory.wav',
};

export class SoundManager {
  private sounds = new Map<SoundId, Howl>();
  private bus: EventBus<CombatEvents>;
  private muted = false;

  constructor(bus: EventBus<CombatEvents>) {
    this.bus = bus;
    this.loadAll();
    this.wireEvents();
  }

  play(id: SoundId): void {
    if (this.muted) return;
    const sound = this.sounds.get(id);
    if (sound) sound.play();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  destroy(): void {
    for (const sound of this.sounds.values()) {
      sound.unload();
    }
    this.sounds.clear();
  }

  private loadAll(): void {
    for (const [id, path] of Object.entries(SOUND_PATHS)) {
      const howl = new Howl({
        src: [path],
        volume: 0.4,
        preload: true,
        onloaderror: () => {
          // Sound file missing — silently skip (placeholder audio not yet added)
        },
      });
      this.sounds.set(id as SoundId, howl);
    }
  }

  private wireEvents(): void {
    this.bus.on('abilityUsed', () => this.play('hit'));
    this.bus.on('characterDefeated', () => this.play('defeat'));
    this.bus.on('turnStart', () => this.play('turnStart'));
    this.bus.on('tileClicked', () => this.play('select'));
  }
}
