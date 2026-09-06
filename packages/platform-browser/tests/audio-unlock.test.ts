/**
 * audio-unlock.test.ts — `AudioManager.unlock` against a context whose
 * `resume()` stays pending (WebKit without a user gesture): the first unlock
 * returns after a bounded grace, later unlocks return at once, audio stays
 * LOCKED (events queue) until the resume finally settles, and then the queue
 * plays. A context that resumes promptly unlocks on the first call.
 *
 * Owner context: platform-browser tests (ADR-333 D4 — a programmatic replay
 * must never hang a turn on audio).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager';

/** A fake AudioContext whose resume settles only when the test says so. */
class PendingContext {
  static instances: PendingContext[] = [];
  state: 'suspended' | 'running' = 'suspended';
  private resolvers: Array<() => void> = [];
  constructor() { PendingContext.instances.push(this); }
  resume(): Promise<void> {
    return new Promise((resolve) => this.resolvers.push(resolve));
  }
  /** The gesture arrives: the context runs and every pending resume settles. */
  run(): void {
    this.state = 'running';
    this.resolvers.splice(0).forEach((r) => r());
  }
  createGain(): unknown { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
  createMediaElementSource(): unknown { return { connect() {} }; }
  get destination(): unknown { return {}; }
  get currentTime(): number { return 0; }
}

class PromptContext extends PendingContext {
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
}

describe('AudioManager.unlock with a resume that stays pending', () => {
  let manager: AudioManager;
  let handled: string[];

  beforeEach(() => {
    PendingContext.instances = [];
    (window as unknown as { AudioContext: unknown }).AudioContext = PendingContext;
    manager = new AudioManager();
    handled = [];
    // Observe what reaches playback: the sfx path is the simplest to trap.
    (manager as unknown as { playSfx: (d: unknown) => void }).playSfx = (d) => { handled.push(String((d as { src: string }).src)); };
  });

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('the first unlock returns after the grace, later ones at once, and audio stays locked meanwhile', async () => {
    const started = Date.now();
    await manager.unlock();
    const waited = Date.now() - started;
    expect(waited).toBeGreaterThanOrEqual(200);
    expect(waited).toBeLessThan(2000);

    const again = Date.now();
    await manager.unlock();
    expect(Date.now() - again).toBeLessThan(100);

    manager.handleAudioEvent({ type: 'audio.sfx', data: { src: 'click.mp3' } });
    expect(handled).toEqual([]); // queued: the context never resumed
  });

  it('unlocks and plays the queue once the pending resume settles', async () => {
    await manager.unlock();
    manager.handleAudioEvent({ type: 'audio.sfx', data: { src: 'click.mp3' } });
    expect(handled).toEqual([]);

    PendingContext.instances[0].run();
    await Promise.resolve();
    await Promise.resolve();

    expect(handled).toEqual(['click.mp3']);
    manager.handleAudioEvent({ type: 'audio.sfx', data: { src: 'later.mp3' } });
    expect(handled).toEqual(['click.mp3', 'later.mp3']);
  });

  it('a context that resumes promptly unlocks on the first call', async () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = PromptContext;
    const prompt = new AudioManager();
    const played: string[] = [];
    (prompt as unknown as { playSfx: (d: unknown) => void }).playSfx = (d) => { played.push(String((d as { src: string }).src)); };

    const started = Date.now();
    await prompt.unlock();
    expect(Date.now() - started).toBeLessThan(100);
    prompt.handleAudioEvent({ type: 'audio.sfx', data: { src: 'now.mp3' } });
    expect(played).toEqual(['now.mp3']);
    vi.restoreAllMocks();
  });
});
