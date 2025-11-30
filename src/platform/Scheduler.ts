/**
 * Scheduler Service (Phase 1 P1-4)
 * Central registry for intervals/timeouts to allow unified lifecycle management.
 */
export type ScheduledTask = {
  label: string;
  intervalMs: number;
  handle: NodeJS.Timeout;
  type: 'interval';
  fn: () => void | Promise<void>;
  startedAt: number;
  runs: number;
};

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private enabled = true;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  schedule(label: string, fn: () => void | Promise<void>, intervalMs: number): void {
    this.cancel(label);
    if (!this.enabled) return;
    const handle = setInterval(async () => {
      const task = this.tasks.get(label);
      if (!task) return;
      try {
        await fn();
      } catch (e) {
        console.error(`[Scheduler] Task ${label} error:`, e);
      } finally {
        task.runs++;
      }
    }, intervalMs);
    this.tasks.set(label, { label, intervalMs, handle, type: 'interval', fn, startedAt: Date.now(), runs: 0 });
  }

  cancel(label: string): void {
    const existing = this.tasks.get(label);
    if (existing) {
      clearInterval(existing.handle);
      this.tasks.delete(label);
    }
  }

  stopAll(): void {
    for (const task of this.tasks.values()) {
      clearInterval(task.handle);
    }
    this.tasks.clear();
  }

  list(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  isScheduled(label: string): boolean {
    return this.tasks.has(label);
  }
}
