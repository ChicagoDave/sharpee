/**
 * AudioManager — handles all audio playback for the browser client.
 *
 * Public interface: beep(), handleAudioEvent(), dispose().
 * Manages ambient loops, music tracks, and PC speaker beeps via
 * Web Audio API and HTMLAudioElement.
 *
 * Owner context: @sharpee/platform-browser
 */

export class AudioManager {
  private audioContext: AudioContext | null = null;

  /** Active ambient audio channels — keyed by channel name */
  private ambientChannels: Map<string, HTMLAudioElement> = new Map();
  /** Active music track */
  private musicTrack: HTMLAudioElement | null = null;
  /** Whether audio has been unlocked by a user gesture */
  private unlocked: boolean = false;
  /** Audio events received before unlock — replayed after first gesture */
  private pendingEvents: Array<{ type: string; data: any }> = [];

  /**
   * Unlock audio playback. Must be called from a user gesture handler
   * (keydown, click) so the browser allows Audio.play().
   */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;

    // Resume AudioContext if it was created in suspended state
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    // Replay any queued events
    const pending = this.pendingEvents.splice(0);
    for (const event of pending) {
      this.handleAudioEvent(event);
    }
  }

  /**
   * Handle an audio event from the engine's event pipeline.
   * Queues events until audio is unlocked by a user gesture.
   *
   * @param event - Object with type and data fields
   */
  handleAudioEvent(event: { type: string; data: any }): void {
    if (!this.unlocked) {
      this.pendingEvents.push(event);
      return;
    }

    const data = event.data ?? {};

    switch (event.type) {
      case 'audio.ambient.play': {
        const channel = data.channel as string;
        const existing = this.ambientChannels.get(channel);
        if (existing) {
          existing.pause();
        }
        const audio = new Audio(data.src);
        audio.loop = data.loop !== false;
        audio.volume = data.volume ?? 0.3;
        audio.play().catch(() => {
          console.debug('[audio] Play failed for ambient channel:', channel);
        });
        this.ambientChannels.set(channel, audio);
        break;
      }

      case 'audio.ambient.stop': {
        const el = this.ambientChannels.get(data.channel);
        if (el) {
          el.pause();
          this.ambientChannels.delete(data.channel);
        }
        break;
      }

      case 'audio.ambient.stop_all': {
        for (const [, el] of this.ambientChannels) {
          el.pause();
        }
        this.ambientChannels.clear();
        break;
      }

      case 'audio.music.play': {
        if (this.musicTrack) {
          this.musicTrack.pause();
        }
        const music = new Audio(data.src);
        music.loop = data.loop !== false;
        music.volume = data.volume ?? 0.5;
        music.play().catch(() => {
          console.debug('[audio] Play failed for music');
        });
        this.musicTrack = music;
        break;
      }

      case 'audio.music.stop': {
        if (this.musicTrack) {
          this.musicTrack.pause();
          this.musicTrack = null;
        }
        break;
      }

      case 'audio.sfx': {
        const sfx = new Audio(data.src);
        sfx.volume = data.volume ?? 1.0;
        sfx.play().catch(() => {
          console.debug('[audio] Play failed for sfx');
        });
        break;
      }

      default:
        break;
    }
  }

  /**
   * Play classic Infocom PC speaker beep.
   * ~800Hz square wave, short duration.
   *
   * @param frequency - Frequency in Hz (default 800)
   * @param duration - Duration in milliseconds (default 100)
   */
  beep(frequency = 800, duration = 100): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.1;

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch {
      // Audio not available, silently ignore
    }
  }

  /**
   * Close audio context and stop all audio
   */
  dispose(): void {
    for (const [, el] of this.ambientChannels) {
      el.pause();
    }
    this.ambientChannels.clear();

    if (this.musicTrack) {
      this.musicTrack.pause();
      this.musicTrack = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
