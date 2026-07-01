const renderer = client.getChannelRenderer();
renderer.registerRenderer('score', {
  onValue: (value) => {
    const { current } = value as { current: number };
    const el = document.getElementById('score-turns'); // the platform status element
    if (el) el.textContent = `★ ${current}`;
  },
});
