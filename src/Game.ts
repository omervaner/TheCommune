/**
 * Top-level game owner — creates the PixiJS Application,
 * wires the SceneManager, and drives the ticker.
 */

import { Application } from 'pixi.js';
import { SceneManager } from '@scenes/SceneManager';
import type { Scene } from '@scenes/SceneManager';
import { APP_BACKGROUND } from '@utils/constants';

export class Game {
  private app: Application;
  private scenes: SceneManager;

  constructor() {
    this.app = new Application();
    this.scenes = new SceneManager();
  }

  /** Initialize PixiJS, attach the ticker, and start the given scene. */
  async start(scene: Scene): Promise<void> {
    await this.app.init({
      background: APP_BACKGROUND,
      resizeTo: window,
      antialias: true,
    });

    document.body.appendChild(this.app.canvas);

    this.scenes.init(this.app);
    this.scenes.start(scene);

    this.app.ticker.add((ticker) => {
      this.scenes.update(ticker.deltaTime);
    });
  }
}
