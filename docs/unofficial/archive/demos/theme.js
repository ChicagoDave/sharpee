/**
 * Light/dark theme toggle.
 * Persists preference in localStorage, shared with sharpee.net.
 */
(function () {
  var btn = document.getElementById('theme-toggle');
  var root = document.documentElement;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    localStorage.setItem('sharpee-theme', theme);
  }

  var saved = localStorage.getItem('sharpee-theme') || 'dark';
  apply(saved);

  btn.addEventListener('click', function () {
    apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
})();
