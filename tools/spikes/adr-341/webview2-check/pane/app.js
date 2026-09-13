// SPIKE CODE — ADR-341 D2, Phase 2 assumption 2. Not product.
// Runs inside WebView2 and reports what the host managed to provide.
(async () => {
  const r = { origin: location.origin, href: location.href };

  // Did the relative stylesheet resolve AND apply?
  r.cssApplied = getComputedStyle(document.getElementById('h')).color === 'rgb(17, 34, 51)';

  // Did the relative script itself load? If this runs at all, yes.
  r.scriptLoaded = true;

  // A relative fetch the host answers from memory, never from disk — this is the
  // "answering the pane's requests for subprocess results" half of D3's contract.
  try {
    const res = await fetch('./api/subprocess-result.json');
    const j = await res.json();
    r.dynamicFetch = res.ok && j.verb === 'build';
    r.dynamicBody = JSON.stringify(j);
  } catch (e) {
    r.dynamicFetch = false;
    r.dynamicError = String(e);
  }

  // localStorage: is it available, and did a value written by a PREVIOUS run of
  // this process survive? Persistence across restarts is what the macOS panes get
  // from WKWebView today.
  try {
    r.priorValue = localStorage.getItem('chord.probe');
    localStorage.setItem('chord.probe', 'written-by-pass-' + (window.__pass ?? '?'));
    r.storageWorks = localStorage.getItem('chord.probe') !== null;
  } catch (e) {
    r.storageWorks = false;
    r.storageError = String(e);
  }

  window.chrome.webview.postMessage(JSON.stringify(r));
})();
