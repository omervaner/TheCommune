/**
 * Minimal scene system — one active scene at a time.
 */

import type { Application } from 'pixi.js';

export interface Scene {
  enter(app: Application): void;
  exit(): void;
  update(dt: number): void;
}

export class SceneManager {
  private active: Scene | null = null;
  private app: Application | null = null;

  /** Bind to a PixiJS Application. */
  init(app: Application): void {
    this.app = app;
  }

  /** Start a scene, exiting the current one if any. */
  start(scene: Scene): void {
    if (!this.app) throw new Error('SceneManager not initialized — call init(app) first');
    if (this.active) this.active.exit();
    this.active = scene;
    scene.enter(this.app);
  }

  /** Forward ticker delta to the active scene. */
  update(dt: number): void {
    if (this.active) this.active.update(dt);
  }

  /** Return the currently active scene (if any). */
  getActive(): Scene | null {
    return this.active;
  }
}
