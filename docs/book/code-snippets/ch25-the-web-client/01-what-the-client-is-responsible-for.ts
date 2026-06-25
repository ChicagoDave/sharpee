const client = new BrowserClient({
  storagePrefix: 'familyzoo-',
  defaultTheme: 'zoo-sunny',            // the theme applied on first load / restore
  // The clickable theme menu is generated at build time from your package.json
  // `sharpee.themes` (Chapter 26); this array is metadata the generator fills in.
  themes: [
    { id: 'zoo-sunny', name: 'Zoo Sunny' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'paper', name: 'Paper' },
  ],
  storyInfo: {
    title: 'Family Zoo',
    authors: 'You',
    version: '1.0.0',
    engineVersion: '',   // filled by `sharpee build`; '' is a valid placeholder
    buildDate: '',
  },
});

client.initialize(elements);          // page elements (after DOMContentLoaded)
client.connectEngine(engine, world);  // wire the engine
await client.start();                 // boot, restore autosave, first look
