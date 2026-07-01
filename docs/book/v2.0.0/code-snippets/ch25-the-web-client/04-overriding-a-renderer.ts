renderer.registerRenderer('zoo.ambience', {
  onValue: (value) => {
    const main = document.getElementById('main-window'); // a stable platform container
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
