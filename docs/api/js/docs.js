/* Sharpee API Docs - Sidebar nav, search, dark mode */

const NAV = [
  { label: 'Foundations', items: [
    { label: 'Entities', href: 'entities.html' },
    { label: 'World Model', href: 'world.html' },
  ]},
  { label: 'Traits', items: [
    { label: 'Core Traits', href: 'traits-core.html' },
    { label: 'State Traits', href: 'traits-state.html' },
    { label: 'Interaction Traits', href: 'traits-interaction.html' },
    { label: 'Physical Traits', href: 'traits-physical.html' },
    { label: 'Combat Traits', href: 'traits-combat.html' },
  ]},
  { label: 'Actions', items: [
    { label: 'Overview', href: 'actions-overview.html' },
    { label: 'Movement', href: 'actions-movement.html' },
    { label: 'Object Handling', href: 'actions-objects.html' },
    { label: 'State Changes', href: 'actions-state.html' },
    { label: 'Physical', href: 'actions-physical.html' },
    { label: 'Sensory & Query', href: 'actions-sensory.html' },
    { label: 'Meta', href: 'actions-meta.html' },
  ]},
  { label: 'Systems', items: [
    { label: 'Capabilities', href: 'capabilities.html' },
    { label: 'Events', href: 'events.html' },
    { label: 'Scope', href: 'scope.html' },
  ]},
  { label: 'Guides', items: [
    { label: 'Authoring Guide', href: 'authoring.html' },
    { label: 'Platform Guide', href: 'platform.html' },
    { label: 'Writing a Story', href: 'platform.html#story' },
    { label: 'Language Packs', href: 'platform.html#language' },
    { label: 'Building a Client', href: 'platform.html#client' },
    { label: 'Text Service', href: 'platform.html#text-service' },
  ]},
];

function buildSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPage = location.pathname.split('/').pop() || 'index.html';

  // Header
  const header = document.createElement('div');
  header.className = 'sidebar-header';
  header.innerHTML = '<a href="index.html">Sharpee API</a>';
  sidebar.appendChild(header);

  // Search
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'sidebar-search';
  search.placeholder = 'Filter pages...';
  search.addEventListener('input', () => filterSidebar(search.value));
  sidebar.appendChild(search);

  // Nav sections
  const nav = document.createElement('div');
  nav.className = 'nav-sections';
  for (const section of NAV) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = section.label;
    details.appendChild(summary);

    const ul = document.createElement('ul');
    let sectionHasActive = false;
    for (const item of section.items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      a.dataset.searchText = item.label.toLowerCase();
      const isActive = item.href === currentPage ||
        item.href === currentPage + location.hash;
      if (isActive) {
        a.classList.add('active');
        sectionHasActive = true;
      }
      li.appendChild(a);
      ul.appendChild(li);
    }
    details.appendChild(ul);

    // Auto-open section containing current page
    if (sectionHasActive) {
      details.open = true;
    }

    nav.appendChild(details);
  }
  sidebar.appendChild(nav);

  // Footer with theme toggle
  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.textContent = getTheme() === 'dark' ? 'Light Mode' : 'Dark Mode';
  toggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    toggle.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
  });
  footer.appendChild(toggle);
  sidebar.appendChild(footer);
}

function filterSidebar(query) {
  const q = query.toLowerCase().trim();
  const links = document.querySelectorAll('#sidebar .nav-sections a');
  const detailsEls = document.querySelectorAll('#sidebar .nav-sections details');

  if (!q) {
    // Reset: show all, only open sections with active links
    links.forEach(a => a.parentElement.style.display = '');
    detailsEls.forEach(d => {
      d.style.display = '';
      d.open = !!d.querySelector('a.active');
    });
    return;
  }

  detailsEls.forEach(details => {
    const items = details.querySelectorAll('a');
    let anyVisible = false;
    items.forEach(a => {
      const match = a.dataset.searchText.includes(q);
      a.parentElement.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    details.style.display = anyVisible ? '' : 'none';
    if (anyVisible) details.open = true;
  });
}

function getTheme() {
  return document.documentElement.getAttribute('data-theme') ||
    localStorage.getItem('sharpee-docs-theme') || 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sharpee-docs-theme', theme);
}

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('sharpee-docs-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', buildSidebar);
