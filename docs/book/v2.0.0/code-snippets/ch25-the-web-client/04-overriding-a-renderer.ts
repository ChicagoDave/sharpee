const renderer = client.getChannelRenderer();
renderer.registerRenderer('zoo.ambience', {
  onValue: (value) => {
    // a stable platform container
    const main = document.getElementById('main-window');
    if (!main) return;
    let line = document.getElementById('zoo-ambience');
    if (!line) {
      line = document.createElement('div');
      line.id = 'zoo-ambience';
      main.prepend(line); // a mood line above the prose
    }
    line.textContent = String(value ?? '');
  },
});
