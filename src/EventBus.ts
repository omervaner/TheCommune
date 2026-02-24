/**
 * Generic typed event emitter.
 * Instantiated per-scene, not a singleton.
 */

type Callback<Args extends unknown[]> = (...args: Args) => void;

export class EventBus<EventMap extends { [K in keyof EventMap]: unknown[] }> {
  private listeners = new Map<keyof EventMap, Callback<unknown[]>[]>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof EventMap>(event: K, cb: Callback<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(cb as Callback<unknown[]>);

    return () => {
      const cbs = this.listeners.get(event);
      if (cbs) {
        const idx = cbs.indexOf(cb as Callback<unknown[]>);
        if (idx !== -1) cbs.splice(idx, 1);
      }
    };
  }

  /** Emit an event with typed arguments. */
  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb(...args);
      }
    }
  }

  /** Remove all listeners. */
  clear(): void {
    this.listeners.clear();
  }
}
