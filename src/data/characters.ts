/**
 * Starting character definitions for v0.1 prototype.
 * 
 * These are intentionally simple — just enough to test combat feel.
 * Full ability design comes later.
 */

import type { Character } from '@game/types';

export function createKaren(): Character {
  return {
    id: 'karen_1',
    name: 'Karen',
    class: 'karen',
    maxResolve: 100,
    currentResolve: 100,
    movement: 3,
    initiative: 8,
    position: { col: 0, row: 0 },
    abilities: [
      {
        id: 'speak_to_manager',
        name: 'I WILL Speak to the Manager',
        description: 'Devastating single-target resolve attack. Nobody is safe.',
        targetType: 'single',
        range: 3,
        resolveDamage: 30,
        cooldown: 0,
        currentCooldown: 0,
      },
      {
        id: 'call_corporate',
        name: 'Call Corporate',
        description: 'Ultimate ability. Massive resolve damage to a single target.',
        targetType: 'single',
        range: 5,
        resolveDamage: 50,
        cooldown: 3,
        currentCooldown: 0,
      },
    ],
    statusEffects: [],
    team: 'player',
    isDefeated: false,
  };
}

export function createTherapist(): Character {
  return {
    id: 'therapist_1',
    name: 'Dr. Feelings',
    class: 'therapist',
    maxResolve: 80,
    currentResolve: 80,
    movement: 2,
    initiative: 5,
    position: { col: 0, row: 0 },
    abilities: [
      {
        id: 'how_does_that_make_you_feel',
        name: 'And How Does That Make You Feel?',
        description: 'Gets inside an enemy\'s head, dealing resolve damage and confusing them.',
        targetType: 'single',
        range: 4,
        resolveDamage: 20,
        cooldown: 0,
        currentCooldown: 0,
        effects: [
          {
            id: 'self_doubt',
            name: 'Self-Doubt',
            duration: 2,
            movementMod: -1,
          },
        ],
      },
    ],
    statusEffects: [],
    team: 'player',
    isDefeated: false,
  };
}

export function createConspiracyTheorist(): Character {
  return {
    id: 'conspiracy_1',
    name: 'Truthseeker Dave',
    class: 'conspiracy_theorist',
    maxResolve: 90,
    currentResolve: 90,
    movement: 3,
    initiative: 6,
    position: { col: 0, row: 0 },
    abilities: [
      {
        id: 'flat_earth_rant',
        name: 'The Earth Is Flat and Here\'s Why',
        description: 'AoE confusion attack. Everyone nearby loses resolve from sheer bewilderment.',
        targetType: 'aoe',
        range: 3,
        aoeRadius: 2,
        resolveDamage: 15,
        cooldown: 1,
        currentCooldown: 0,
      },
    ],
    statusEffects: [],
    team: 'player',
    isDefeated: false,
  };
}

/** Generic enemy for v0.1 testing */
export function createCorpGoon(): Character {
  return {
    id: 'goon_1',
    name: 'Corporate Goon',
    class: 'corporate_goon',
    maxResolve: 60,
    currentResolve: 60,
    movement: 3,
    initiative: 4,
    position: { col: 0, row: 0 },
    abilities: [
      {
        id: 'eviction_notice',
        name: 'Eviction Notice',
        description: 'Serves legal paperwork. Boring but effective.',
        targetType: 'single',
        range: 2,
        resolveDamage: 15,
        cooldown: 0,
        currentCooldown: 0,
      },
    ],
    statusEffects: [],
    team: 'enemy',
    isDefeated: false,
  };
}
