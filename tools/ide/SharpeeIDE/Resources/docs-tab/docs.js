(() => {
  // web/docs-tab/src/main.ts
  var host = (body) => window.webkit?.messageHandlers?.docsTab?.postMessage(body);
  var index = { chordLanguageVersion: "", pages: [] };
  var current = "";
  var el = (id) => document.getElementById(id);
  function groups(pages) {
    const map = /* @__PURE__ */ new Map();
    for (const page of pages) {
      const segments = page.href.split("/").filter(Boolean);
      const key = segments.slice(0, Math.min(2, segments.length - 1)).join("/") || segments[0];
      const list = map.get(key);
      if (list) list.push(page);
      else map.set(key, [page]);
    }
    return map;
  }
  function humanize(segment) {
    const s = segment.replace(/-/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function renderNav(pages) {
    const nav = el("nav");
    nav.textContent = "";
    if (pages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "nav-empty";
      empty.textContent = "No pages match.";
      nav.appendChild(empty);
      return;
    }
    for (const [key, list] of groups(pages)) {
      const heading = document.createElement("p");
      heading.className = "nav-group";
      heading.textContent = key.split("/").map(humanize).join(" \u203A ");
      nav.appendChild(heading);
      for (const page of list) {
        const link = document.createElement("a");
        link.className = "nav-link" + (page.href === current ? " is-current" : "");
        link.textContent = page.title;
        link.dataset.href = page.href;
        link.href = page.href;
        nav.appendChild(link);
      }
    }
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
    content.scrollTop = 0;
    renderNav(filtered());
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
    el("version").textContent = `Chord ${index.chordLanguageVersion}`;
    el("search").addEventListener("input", () => renderNav(filtered()));
    document.addEventListener("click", handleClick);
    window.__sharpeeDocs = { setToolchainVersion, showPage: (href) => void showPage(href) };
    const first = index.pages.find((p) => p.href === "/chord/getting-started/first-story");
    await showPage(first ? first.href : index.pages[0]?.href ?? "");
    host({ type: "ready" });
  }
  void boot();
})();
