import { Game } from './Game';
import { CommuneScene } from '@scenes/CommuneScene';
import { CombatScene } from '@scenes/CombatScene';
import { CommuneState } from '@game/CommuneState';
import { createKaren, createTherapist, createConspiracyTheorist, createCorpGoon } from '@data/characters';
import type { CombatResult } from '@scenes/CombatScene';

const game = new Game();

// Initial roster
const karen = createKaren();
karen.position = { col: 1, row: 3 };

const therapist = createTherapist();
therapist.position = { col: 0, row: 5 };

const dave = createConspiracyTheorist();
dave.position = { col: 2, row: 6 };

const communeState = new CommuneState([karen, therapist, dave]);

function createTestEnemies() {
  const goon1 = createCorpGoon();
  goon1.id = 'goon_1';
  goon1.position = { col: 8, row: 3 };

  const goon2 = createCorpGoon();
  goon2.id = 'goon_2';
  goon2.name = 'Corporate Goon #2';
  goon2.position = { col: 7, row: 5 };

  return [goon1, goon2];
}

function makeCommuneScene(): CommuneScene {
  return new CommuneScene({
    state: communeState,
    onStartCombat: (squad) => {
      game.switchScene(new CombatScene({
        squad,
        enemies: createTestEnemies(),
        onComplete: (result: CombatResult) => {
          communeState.applyMorale(result === 'player_wins' ? 10 : -10);
          communeState.day++;
          game.switchScene(makeCommuneScene());
        },
      }));
    },
  });
}

game.start(makeCommuneScene()).catch(console.error);
