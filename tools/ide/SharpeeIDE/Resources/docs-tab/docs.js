(() => {
  // tools/ide/web/docs-tab/src/main.ts
  var host = (body) => window.webkit?.messageHandlers?.docsTab?.postMessage(body);
  var index = { chordLanguageVersion: "", nav: [], pages: [] };
  var current = "";
  var stepsBySection = /* @__PURE__ */ new Map();
  var el = (id) => document.getElementById(id);
  function buildSteps(nav) {
    const map = /* @__PURE__ */ new Map();
    for (const section of nav) {
      const steps = [];
      for (const group of section.groups) {
        for (const item of group.items) {
          steps.push({ href: item.href, label: item.title === "Overview" ? group.title : item.title });
          for (const child of item.children ?? []) {
            steps.push({ href: child.href, label: child.title });
          }
        }
      }
      map.set(section.title, steps);
    }
    return map;
  }
  function navLink(href, label, className) {
    const link = document.createElement("a");
    link.className = className + (href === current ? " is-current" : "");
    link.textContent = label;
    link.dataset.href = href;
    link.href = href;
    return link;
  }
  function renderNavTree() {
    const nav = el("nav");
    nav.textContent = "";
    for (const section of index.nav) {
      const heading = document.createElement("p");
      heading.className = "nav-section";
      heading.textContent = section.title;
      if (section.version) {
        const version = document.createElement("span");
        version.className = "nav-version";
        version.textContent = section.version;
        heading.appendChild(version);
      }
      nav.appendChild(heading);
      for (const group of section.groups) {
        const groupHeading = document.createElement("p");
        groupHeading.className = "nav-group";
        groupHeading.textContent = group.title;
        nav.appendChild(groupHeading);
        for (const item of group.items) {
          nav.appendChild(navLink(item.href, item.title, "nav-link"));
          const children = item.children ?? [];
          const onBranch = current === item.href || children.some((c) => c.href === current);
          if (!onBranch) continue;
          for (const child of children) {
            nav.appendChild(navLink(child.href, child.title, "nav-link nav-child"));
          }
        }
      }
    }
  }
  function renderNavMatches(pages) {
    const nav = el("nav");
    nav.textContent = "";
    if (pages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "nav-empty";
      empty.textContent = "No pages match.";
      nav.appendChild(empty);
      return;
    }
    let section = "";
    for (const page of pages) {
      if (page.section !== section) {
        section = page.section;
        const heading = document.createElement("p");
        heading.className = "nav-section";
        heading.textContent = section;
        nav.appendChild(heading);
      }
      nav.appendChild(navLink(page.href, page.navTitle, "nav-link"));
    }
  }
  function renderNav() {
    const query = el("search").value.trim();
    if (query === "") renderNavTree();
    else renderNavMatches(filtered());
  }
  function renderPager(page) {
    const steps = stepsBySection.get(page.section) ?? [];
    const at = steps.findIndex((s) => s.href === page.href);
    if (at === -1) return;
    const pager = document.createElement("nav");
    pager.className = "pager";
    const prev = steps[at - 1];
    const next = steps[at + 1];
    if (prev) {
      const link = navLink(prev.href, prev.label, "pager-link pager-prev");
      link.dataset.rel = "prev";
      pager.appendChild(link);
    }
    if (next) {
      const link = navLink(next.href, next.label, "pager-link pager-next");
      link.dataset.rel = "next";
      pager.appendChild(link);
    }
    if (pager.childElementCount > 0) el("content").appendChild(pager);
  }
  async function showPage(href) {
    const page = index.pages.find((p) => p.href === href);
    const content = el("content");
    if (!page) {
      content.innerHTML = `<p class="missing">This page is not in the bundled documentation.</p>`;
      return;
    }
    current = href;
    const response = await fetch(`pages/${page.slug}.html`);
    const html = await response.text();
    content.innerHTML = `<p class="crumb">${page.crumb}</p><h1 class="page-title">${page.title}</h1>` + html;
    renderPager(page);
    content.scrollTop = 0;
    renderNav();
    host({ type: "shown", href });
  }
  function filtered() {
    const query = el("search").value.trim().toLowerCase();
    if (query === "") return index.pages;
    return index.pages.filter(
      (p) => p.title.toLowerCase().includes(query) || p.text.toLowerCase().includes(query)
    );
  }
  function handleClick(event) {
    const anchor = event.target?.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    if (href.startsWith("#")) return;
    event.preventDefault();
    if (/^https?:/.test(href)) {
      host({ type: "openExternal", url: href });
      return;
    }
    void showPage(href.split("#")[0]);
  }
  function setToolchainVersion(version) {
    const banner = el("version-banner");
    const bundled = index.chordLanguageVersion;
    if (version === "" || bundled === "" || version === bundled) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    banner.textContent = `These pages document Chord ${bundled}, but the toolchain in use reports Chord ${version}. Where they disagree, the compiler is right.`;
  }
  async function boot() {
    index = await (await fetch("docs-index.json")).json();
    stepsBySection = buildSteps(index.nav);
    el("version").textContent = `Chord ${index.chordLanguageVersion}`;
    el("search").addEventListener("input", () => renderNav());
    document.addEventListener("click", handleClick);
    window.__sharpeeDocs = { setToolchainVersion, showPage: (href) => void showPage(href) };
    await showPage(index.pages[0]?.href ?? "");
    host({ type: "ready" });
  }
  void boot();
})();
