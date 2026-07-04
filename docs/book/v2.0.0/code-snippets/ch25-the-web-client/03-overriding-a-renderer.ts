const renderer = client.getChannelRenderer();
renderer.registerRenderer('score', {
  onValue: (value) => {
    const { current } = value as { current: number };
    // the platform status element
    const el = document.getElementById('score-turns');
    if (el) el.textContent = `★ ${current}`;
  },
});
