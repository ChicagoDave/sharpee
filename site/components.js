/**
 * Shared site components — sidebar, footer.
 * Each page includes a placeholder, this script fills it in.
 */
(function () {
  var currentPage = location.pathname.split('/').pop() || 'index.html';

  function link(href, text) {
    var cls = (href === currentPage) ? ' class="active"' : '';
    return '<a' + cls + ' href="' + href + '">' + text + '</a>';
  }

  var sidebarHTML =
    '<div class="site-title">Sharpee</div>' +
    '<nav>' +
      link('index.html', 'Home') +
      link('getting-started.html', 'Getting Started') +
      '<hr>' +
      link('cloak-of-darkness.html', 'Cloak of Darkness') +
      link('family-zoo.html', 'Family Zoo') +
      '<hr>' +
      link('community.html', 'Community') +
      link('news.html', 'News') +
      '<hr>' +
      '<a href="https://github.com/ChicagoDave/sharpee/tree/main/packages/sharpee/docs/genai-api">API Reference</a>' +
      '<a href="https://github.com/ChicagoDave/sharpee/tree/main/docs/guides">Author Guides</a>' +
    '</nav>' +
    '<div class="theme-toggle">' +
      '<button id="theme-toggle">Light mode</button>' +
    '</div>';

  var footerHTML =
    '<span>&copy; 2025 David Cornelson. MIT License.</span>' +
    '<div class="footer-links">' +
      '<a href="https://github.com/ChicagoDave/sharpee">GitHub</a>' +
    '</div>';

  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = sidebarHTML;

  var footer = document.getElementById('footer');
  if (footer) footer.innerHTML = footerHTML;
})();
