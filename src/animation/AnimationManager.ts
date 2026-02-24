/**
 * Tracks whether animations are in flight so input can be blocked.
 * Uses a counter to handle nested/overlapping animation calls safely.
 */

export class AnimationManager {
  private count = 0;

  /** Run an animation function. Increments the playing counter while it runs. */
  async play(fn: () => Promise<void>): Promise<void> {
    this.count++;
    try {
      await fn();
    } finally {
      this.count--;
    }
  }

  /** True if any animation is currently running */
  isPlaying(): boolean {
    return this.count > 0;
  }
}
