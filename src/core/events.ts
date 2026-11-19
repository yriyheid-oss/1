export interface GameEvents {
  jump_started: { fromY: number; toY: number; isLedgeHop: boolean };
  landed: { y: number; surfaceId: string };
  bell_chimed: { x: number; y: number; z: number; radius: number; harmonic: number };
  lock_unlocked: { id: string; x: number; y: number; z: number };
  gear_toggled: { id: string; reversed: boolean };
  alert_changed: { level: number; spotted: boolean };
  checkpoint_reached: { id: string; x: number; y: number; z: number };
  respawned: { reason: 'spotlight' | 'water' };
  dialogue_started: { npcId: string };
  district_completed: { districtId: string };
}

type Listener<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof GameEvents, Set<Listener<never>>>();

  on<K extends keyof GameEvents>(event: K, fn: Listener<GameEvents[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => {
      set?.delete(fn as Listener<never>);
    };
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as Listener<GameEvents[K]>)(payload);
    }
  }
}
