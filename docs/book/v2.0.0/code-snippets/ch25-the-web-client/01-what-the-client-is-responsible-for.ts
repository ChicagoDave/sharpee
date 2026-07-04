import {
  STORY_VERSION,
  ENGINE_VERSION,
  BUILD_DATE,
} from './version.js';

const client = new BrowserClient({
  storagePrefix: 'familyzoo-',
  // the theme applied on first load / restore
  defaultTheme: 'zoo-sunny',
  // The clickable theme menu is generated at build time
  // from your package.json `sharpee.themes` (Chapter 26);
  // this array is metadata the generator fills in.
  themes: [
    { id: 'zoo-sunny', name: 'Zoo Sunny' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'paper', name: 'Paper' },
  ],
  storyInfo: {
    title: 'Family Zoo',
    authors: 'You',
    // all three stamped into './version.js'
    version: STORY_VERSION,
    engineVersion: ENGINE_VERSION, // by `sharpee build`
    buildDate: BUILD_DATE,
  },
});

// page elements (after DOMContentLoaded)
client.initialize(elements);
client.connectEngine(engine, world);  // wire the engine
// boot, restore autosave, first look
await client.start();
