import { Game } from './Game';
import { CombatScene } from '@scenes/CombatScene';

const game = new Game();
game.start(new CombatScene()).catch(console.error);
