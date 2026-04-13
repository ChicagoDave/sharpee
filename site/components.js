/**
 * Shared site components — sidebar, footer, zoo step tabs.
 * Each page includes placeholders, this script fills them in.
 */
(function () {
  var currentPage = location.pathname.split('/').pop() || 'index.html';

  function link(href, text) {
    var cls = (href === currentPage) ? ' class="active"' : '';
    return '<a' + cls + ' href="' + href + '">' + text + '</a>';
  }

  // For zoo pages, highlight "Family Zoo" in the sidebar
  var isZooPage = currentPage === 'family-zoo.html' || currentPage.indexOf('zoo-') === 0;

  function sidebarLink(href, text) {
    var active = (href === currentPage) || (isZooPage && href === 'family-zoo.html');
    var cls = active ? ' class="active"' : '';
    return '<a' + cls + ' href="' + href + '">' + text + '</a>';
  }

  var sidebarHTML =
    '<div class="site-title">Sharpee</div>' +
    '<nav>' +
      link('index.html', 'Home') +
      link('getting-started.html', 'Getting Started') +
      '<hr>' +
      link('cloak-of-darkness.html', 'Cloak of Darkness') +
      sidebarLink('family-zoo.html', 'Family Zoo') +
      '<hr>' +
      link('community.html', 'Community') +
      link('news.html', 'News') +
      '<hr>' +
      '<a href="https://demos.sharpee.net">Demos</a>' +
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

  // Zoo step tabs — only rendered on zoo tutorial pages
  var stepTabs = document.getElementById('step-tabs');
  if (stepTabs) {
    var steps = [
      { n: '01', label: 'A Single Room' },
      { n: '02', label: 'Multiple Rooms' },
      { n: '03', label: 'Scenery' },
      { n: '04', label: 'Portable Objects' },
      { n: '05', label: 'Containers' },
      { n: '06', label: 'Openable' },
      { n: '07', label: 'Locked Doors' },
      { n: '08', label: 'Light & Dark' },
      { n: '09', label: 'Readable' },
      { n: '10', label: 'Switchable' },
      { n: '11', label: 'NPCs' },
      { n: '12', label: 'Event Handlers' },
      { n: '13', label: 'Custom Actions' },
      { n: '14', label: 'Capability Dispatch' },
      { n: '15', label: 'Timed Events' },
      { n: '16', label: 'Scoring & Endgame' },
      { n: '17', label: 'Putting It All Together' },
    ];

    var html = '<a class="step-tab' + (currentPage === 'family-zoo.html' ? ' active' : '') +
      '" href="family-zoo.html" title="Overview">Intro</a>';

    steps.forEach(function (s) {
      var file = 'zoo-' + s.n + '.html';
      var active = (file === currentPage) ? ' active' : '';
      html += '<a class="step-tab' + active + '" href="' + file + '" title="' + s.label + '">' + s.n.replace(/^0/, '') + '</a>';
    });

    stepTabs.innerHTML = html;
  }
})();
