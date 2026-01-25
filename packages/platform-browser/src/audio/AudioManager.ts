/**
 * AudioManager - handles audio playback (PC speaker beep)
 */

export class AudioManager {
  private audioContext: AudioContext | null = null;

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

      oscillator.type = 'square'; // PC speaker was square wave
      oscillator.frequency.value = frequency;

      gainNode.gain.value = 0.1; // Not too loud

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch {
      // Audio not available, silently ignore
    }
  }

  /**
   * Close the audio context if open
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
