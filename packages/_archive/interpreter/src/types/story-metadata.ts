/**
 * Metadata schema for .sharpee story bundles (meta.json).
 * Maps from StoryConfig at build time; read by the runner at load time.
 */
export interface StoryMetadata {
  format: 'sharpee-story';
  formatVersion: 1;
  title: string;
  author: string | string[];
  version: string;
  description?: string;
  sharpeeVersion: string;
  ifid?: string;
  hasAssets: boolean;
  hasTheme: boolean;
  preferredTheme?: string;
}
