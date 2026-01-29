import { unzipSync } from 'fflate';
import type { StoryMetadata } from '../types/story-metadata';

export interface LoadedBundle {
  metadata: StoryMetadata;
  storyModuleUrl: string;
  assets: Map<string, string>;
  themeCSS?: string;
}

export async function loadBundle(source: ArrayBuffer): Promise<LoadedBundle> {
  const files = unzipSync(new Uint8Array(source));

  const metaBytes = files['meta.json'];
  if (!metaBytes) throw new Error('Invalid .sharpee bundle: missing meta.json');
  const metadata: StoryMetadata = JSON.parse(new TextDecoder().decode(metaBytes));

  if (metadata.format !== 'sharpee-story') {
    throw new Error(`Unknown bundle format: ${metadata.format}`);
  }

  const storyBytes = files['story.js'];
  if (!storyBytes) throw new Error('Invalid .sharpee bundle: missing story.js');
  const storyBlob = new Blob([storyBytes.buffer as ArrayBuffer], { type: 'application/javascript' });
  const storyModuleUrl = URL.createObjectURL(storyBlob);

  const assets = new Map<string, string>();
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith('assets/')) {
      const mimeType = guessMimeType(path);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
      assets.set(path.slice('assets/'.length), URL.createObjectURL(blob));
    }
  }

  let themeCSS: string | undefined;
  if (files['theme.css']) {
    themeCSS = new TextDecoder().decode(files['theme.css']);
  }

  return { metadata, storyModuleUrl, assets, themeCSS };
}

export function releaseBundle(bundle: LoadedBundle): void {
  URL.revokeObjectURL(bundle.storyModuleUrl);
  for (const url of bundle.assets.values()) {
    URL.revokeObjectURL(url);
  }
}

function guessMimeType(path: string): string {
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.css')) return 'text/css';
  return 'application/octet-stream';
}
