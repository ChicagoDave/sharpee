/**
 * AudioManager — handles all audio playback for the browser client.
 *
 * Public interface: unlock(), handleAudioEvent(), dispose().
 * Manages ambient loops and music tracks via the Web Audio API
 * (per-stream MediaElementAudioSourceNode -> GainNode graph) with
 * sample-accurate fade-in / fade-out / cross-fade. SFX uses a bare
 * HTMLAudioElement and is exempt from fades by design (ADR-169).
 *
 * If the browser cannot create an AudioContext, the manager falls
 * back to instant-gain mode: audio still plays via HTMLAudioElement,
 * fade ramps are skipped.
 *
 * Owner context: @sharpee/platform-browser
 */

interface ActiveStream {
  /** The HTMLAudioElement playing the source. */
  el: HTMLAudioElement;
  /** Web Audio source node, or null in instant-gain fallback. */
  source: MediaElementAudioSourceNode | null;
  /** Volume control node, or null in instant-gain fallback. */
  gain: GainNode | null;
  /** Stored fade-out (ms) for this stream's eventual stop or replacement. */
  fadeOut: number;
  /** Target gain value (ramp destination on play; ramp source on stop). */
  targetVolume: number;
  /** setTimeout handle used to tear down a fading-out stream. */
  teardownTimer?: ReturnType<typeof setTimeout>;
}

const DEFAULT_FADE_IN_AMBIENT = 1500;
const DEFAULT_FADE_OUT_AMBIENT = 800;
const DEFAULT_FADE_IN_MUSIC = 2000;
const DEFAULT_FADE_OUT_MUSIC = 1500;

const DEFAULT_AMBIENT_VOLUME = 0.3;
const DEFAULT_MUSIC_VOLUME = 0.5;
const DEFAULT_SFX_VOLUME = 1.0;

export class AudioManager {
  private ambientChannels: Map<string, ActiveStream> = new Map();
  private musicTrack: ActiveStream | null = null;
  private outgoingStreams: Set<ActiveStream> = new Set();

  private audioContext: AudioContext | null = null;
  private instantGainMode: boolean = false;
  private unlocked: boolean = false;
  private pendingEvents: Array<{ type: string; data: any }> = [];

  /**
   * Unlock audio playback. Must be called from a user gesture handler
   * (keydown, click) so the browser allows AudioContext.resume() and
   * Audio.play(). Constructs the AudioContext lazily on first call.
   */
  async unlock(): Promise<void> {
    if (this.unlocked) return;

    try {
      if (!this.audioContext) {
        const Ctor =
          (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) {
          this.audioContext = new Ctor();
        } else {
          this.instantGainMode = true;
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (err) {
      console.debug('[audio] AudioContext unavailable, instant-gain fallback:', err);
      this.audioContext = null;
      this.instantGainMode = true;
    }

    this.unlocked = true;

    const pending = this.pendingEvents.splice(0);
    for (const event of pending) {
      this.handleAudioEvent(event);
    }
  }

  /**
   * Handle an audio event from the engine's event pipeline.
   * Queues events until audio is unlocked by a user gesture.
   *
   * @param event - Object with `type` and `data` fields.
   */
  handleAudioEvent(event: { type: string; data: any }): void {
    if (!this.unlocked) {
      this.pendingEvents.push(event);
      return;
    }

    const data = event.data ?? {};

    switch (event.type) {
      case 'audio.ambient.play':
        this.playAmbient(data);
        break;
      case 'audio.ambient.stop':
        this.stopAmbient(data);
        break;
      case 'audio.ambient.stop_all':
        this.stopAllAmbient(data);
        break;
      case 'audio.music.play':
        this.playMusic(data);
        break;
      case 'audio.music.stop':
        this.stopMusic(data);
        break;
      case 'audio.sfx':
        this.playSfx(data);
        break;
      default:
        break;
    }
  }

  /**
   * Tear down all audio resources. Cuts audio without ramping —
   * dispose is the explicit teardown path. Safe to call before
   * unlock(): the AudioContext close is null-guarded.
   */
  dispose(): void {
    for (const [, stream] of this.ambientChannels) {
      this.teardownStreamInstant(stream);
    }
    this.ambientChannels.clear();

    if (this.musicTrack) {
      this.teardownStreamInstant(this.musicTrack);
      this.musicTrack = null;
    }

    for (const stream of this.outgoingStreams) {
      this.teardownStreamInstant(stream);
    }
    this.outgoingStreams.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {
        /* swallow — page is tearing down */
      });
    }
    this.audioContext = null;
  }

  // ------------------------------------------------------------------
  // Event handlers
  // ------------------------------------------------------------------

  private playAmbient(data: any): void {
    const channel = data.channel as string;
    const targetVolume = (data.volume as number) ?? DEFAULT_AMBIENT_VOLUME;
    const loop = data.loop !== false;
    const fadeIn = this.validateFadeMs(data.fadeIn) ?? DEFAULT_FADE_IN_AMBIENT;
    const fadeOut = this.validateFadeMs(data.fadeOut) ?? DEFAULT_FADE_OUT_AMBIENT;

    const outgoing = this.ambientChannels.get(channel);
    if (outgoing) {
      this.ambientChannels.delete(channel);
      this.startFadeOut(outgoing, outgoing.fadeOut);
    }

    const stream = this.startStream(data.src as string, loop, targetVolume, fadeIn, fadeOut);
    if (stream) {
      this.ambientChannels.set(channel, stream);
    }
  }

  private stopAmbient(data: any): void {
    const channel = data.channel as string;
    const stream = this.ambientChannels.get(channel);
    if (!stream) return;
    const fadeOut = this.validateFadeMs(data.fadeOut) ?? stream.fadeOut;
    this.ambientChannels.delete(channel);
    this.startFadeOut(stream, fadeOut);
  }

  private stopAllAmbient(data: any): void {
    const override = this.validateFadeMs(data.fadeOut);
    for (const [, stream] of this.ambientChannels) {
      this.startFadeOut(stream, override ?? stream.fadeOut);
    }
    this.ambientChannels.clear();
  }

  private playMusic(data: any): void {
    const targetVolume = (data.volume as number) ?? DEFAULT_MUSIC_VOLUME;
    const loop = data.loop !== false;
    const fadeIn = this.validateFadeMs(data.fadeIn) ?? DEFAULT_FADE_IN_MUSIC;
    const fadeOut = this.validateFadeMs(data.fadeOut) ?? DEFAULT_FADE_OUT_MUSIC;

    const outgoing = this.musicTrack;
    if (outgoing) {
      this.musicTrack = null;
      this.startFadeOut(outgoing, outgoing.fadeOut);
    }

    const stream = this.startStream(data.src as string, loop, targetVolume, fadeIn, fadeOut);
    if (stream) {
      this.musicTrack = stream;
    }
  }

  private stopMusic(data: any): void {
    const stream = this.musicTrack;
    if (!stream) return;
    const fadeOut = this.validateFadeMs(data.fadeOut) ?? stream.fadeOut;
    this.musicTrack = null;
    this.startFadeOut(stream, fadeOut);
  }

  private playSfx(data: any): void {
    const sfx = new Audio(data.src);
    sfx.volume = (data.volume as number) ?? DEFAULT_SFX_VOLUME;
    sfx.play().catch(() => {
      console.debug('[audio] Play failed for sfx');
    });
  }

  // ------------------------------------------------------------------
  // Stream lifecycle
  // ------------------------------------------------------------------

  /**
   * Construct a new stream: HTMLAudioElement + (optionally) Web Audio
   * graph + fade-in ramp. Returns null only on truly unrecoverable
   * failure (no src). In all other cases returns an ActiveStream,
   * possibly in instant-gain mode (graph nodes null).
   */
  private startStream(
    src: string,
    loop: boolean,
    targetVolume: number,
    fadeInMs: number,
    storedFadeOutMs: number,
  ): ActiveStream | null {
    if (!src) return null;

    const el = new Audio(src);
    el.loop = loop;

    if (this.instantGainMode || !this.audioContext) {
      el.volume = targetVolume;
      el.play().catch(() => {
        console.debug('[audio] Play failed (instant-gain mode)');
      });
      return { el, source: null, gain: null, fadeOut: storedFadeOutMs, targetVolume };
    }

    let source: MediaElementAudioSourceNode;
    let gain: GainNode;
    try {
      source = this.audioContext.createMediaElementSource(el);
      gain = this.audioContext.createGain();
      source.connect(gain);
      gain.connect(this.audioContext.destination);
    } catch (err) {
      console.debug('[audio] Failed to build graph, instant-gain fallback for this stream:', err);
      el.volume = targetVolume;
      el.play().catch(() => {
        console.debug('[audio] Play failed (graph build fallback)');
      });
      return { el, source: null, gain: null, fadeOut: storedFadeOutMs, targetVolume };
    }

    el.volume = 1.0;
    this.scheduleFadeIn(gain, targetVolume, fadeInMs);
    el.play().catch(() => {
      console.debug('[audio] Play failed for graph stream');
    });

    return { el, source, gain, fadeOut: storedFadeOutMs, targetVolume };
  }

  /**
   * Begin a fade-out on `stream` and schedule its teardown after the
   * fade completes. The stream is moved into `outgoingStreams` until
   * teardown fires.
   */
  private startFadeOut(stream: ActiveStream, durationMs: number): void {
    if (stream.teardownTimer) {
      clearTimeout(stream.teardownTimer);
      stream.teardownTimer = undefined;
    }

    if (this.instantGainMode || !stream.gain || !this.audioContext) {
      try {
        stream.el.pause();
      } catch {
        /* ignore */
      }
      return;
    }

    const ctx = this.audioContext;

    if (durationMs <= 0) {
      this.teardownStreamInstant(stream);
      return;
    }

    // Ramp-mid-fade pattern: cancel any in-flight schedule, anchor at
    // the current value, then ramp to 0 over the requested duration.
    const now = ctx.currentTime;
    const current = stream.gain.gain.value;
    stream.gain.gain.cancelScheduledValues(now);
    stream.gain.gain.setValueAtTime(current, now);
    stream.gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

    this.outgoingStreams.add(stream);
    stream.teardownTimer = setTimeout(() => {
      this.teardownStreamInstant(stream);
      this.outgoingStreams.delete(stream);
    }, durationMs);
  }

  /**
   * Schedule a fade-in ramp from 0 to target on the gain node.
   * Anchors at 0 with setValueAtTime so the ramp has a defined start.
   */
  private scheduleFadeIn(gain: GainNode, target: number, durationMs: number): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    if (durationMs <= 0) {
      gain.gain.setValueAtTime(target, now);
    } else {
      gain.gain.linearRampToValueAtTime(target, now + durationMs / 1000);
    }
  }

  /**
   * Tear down a stream's graph + element synchronously, no ramping.
   * Used by dispose() and at the tail of fade-out timers.
   */
  private teardownStreamInstant(stream: ActiveStream): void {
    if (stream.teardownTimer) {
      clearTimeout(stream.teardownTimer);
      stream.teardownTimer = undefined;
    }
    try {
      if (stream.gain && this.audioContext) {
        stream.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
      }
    } catch {
      /* ignore */
    }
    try {
      stream.source?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      stream.gain?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      stream.el.pause();
    } catch {
      /* ignore */
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /**
   * Validate a fade-duration value from event payload.
   * Returns the value in ms, or undefined if invalid (callers fall
   * back to defaults). Per ADR-169: negative, NaN, non-finite, and
   * Infinity are all invalid; 0 is honored (instant cut).
   */
  private validateFadeMs(value: unknown): number | undefined {
    if (typeof value !== 'number') return undefined;
    if (!Number.isFinite(value)) return undefined;
    if (value < 0) return undefined;
    return value;
  }
}
