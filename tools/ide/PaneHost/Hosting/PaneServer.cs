// Resolves IDE pane URLs to bytes on disk, and injects at serve time what the
// macOS app injects with WKUserScript.
//
// Ported from the OpenSilver spike's PaneServer (same resolution rules, same
// MIME table, same reserved prefix) with one deliberate difference: this host
// has no parent frame, so the shim posts to Avalonia's own web-message bridge
// instead of window.parent, and the host drives the page with InvokeScript
// instead of posting into an iframe.
//
// Public interface: PaneServer, PaneResponse, the scheme constants.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Text;

namespace PaneHost.Hosting;

/// <summary>One served response: HTTP status, content type, body bytes.</summary>
public readonly record struct PaneResponse(int Status, string ContentType, byte[] Body);

/// <summary>Resolves pane paths under the story bundle, the testing-surface assets, and the docs root.</summary>
public sealed class PaneServer
{
    public const string PlayScheme = "sharpee-play";
    public const string DocsScheme = "sharpee-docs";
    public const string Host = "app";

    /// <summary>Reserved prefix the testing surface's own assets load under — IDE files, never story files.</summary>
    public const string TestingSurfacePrefix = "ide-testing-surface/";

    private readonly string? _bundleRoot;
    private readonly string? _testingSurfaceRoot;
    private readonly string? _docsRoot;
    private readonly string _sessionJson;

    /// <param name="bundleRoot">The story's dist/web/&lt;id&gt;/ directory, or null when no story is open — the docs pane needs none.</param>
    /// <param name="testingSurfaceRoot">Directory holding surface.js and surface.css, or null.</param>
    /// <param name="docsRoot">The docs tab's web root, or null.</param>
    /// <param name="sessionJson">The testing session payload (story, seed, document, …) as JSON.</param>
    public PaneServer(string? bundleRoot, string? testingSurfaceRoot, string? docsRoot, string sessionJson)
    {
        _bundleRoot = bundleRoot;
        _testingSurfaceRoot = testingSurfaceRoot;
        _docsRoot = docsRoot;
        _sessionJson = sessionJson;
    }

    /// <summary>
    /// Resolves one request to a response. Never throws for a bad path or an
    /// unknown scheme; answers 404 instead, the way a scheme handler must.
    /// </summary>
    public PaneResponse Resolve(string scheme, string url)
    {
        var path = RelativePath(url);
        switch (scheme)
        {
            case PlayScheme:
                if (path.StartsWith(TestingSurfacePrefix, StringComparison.Ordinal))
                    return Serve(_testingSurfaceRoot, path.Substring(TestingSurfacePrefix.Length));
                if (path == "index-testing.html")
                    return Injected(_bundleRoot, path, head: HostShimScript + BootScript(_sessionJson), tail: AssetInjectorScript);
                if (path == "index.html")
                    return Injected(_bundleRoot, path, head: HostShimScript, tail: null);
                return Serve(_bundleRoot, path);
            case DocsScheme:
                if (path == "index.html")
                    return Injected(_docsRoot, path, head: HostShimScript, tail: DocsLoadedScript);
                return Serve(_docsRoot, path);
            default:
                return NotFound();
        }
    }

    /// <summary>Strips scheme, host, query and leading slash; empty becomes index.html.</summary>
    public static string RelativePath(string url)
    {
        var s = url;
        var schemeEnd = s.IndexOf("://", StringComparison.Ordinal);
        if (schemeEnd >= 0)
        {
            s = s.Substring(schemeEnd + 3);
            var slash = s.IndexOf('/');
            s = slash >= 0 ? s.Substring(slash + 1) : string.Empty;
        }
        var q = s.IndexOfAny(new[] { '?', '#' });
        if (q >= 0) s = s.Substring(0, q);
        s = Uri.UnescapeDataString(s);
        return s.Length == 0 ? "index.html" : s;
    }

    private static PaneResponse Serve(string? root, string relative)
    {
        if (root is null) return NotFound();
        var full = Path.GetFullPath(Path.Combine(root, relative));
        var rootFull = Path.GetFullPath(root) + Path.DirectorySeparatorChar;
        if (!full.StartsWith(rootFull, StringComparison.Ordinal) || !File.Exists(full)) return NotFound();
        return new PaneResponse(200, MimeType(Path.GetExtension(full)), File.ReadAllBytes(full));
    }

    private static PaneResponse Injected(string? root, string relative, string head, string? tail)
    {
        var raw = Serve(root, relative);
        if (raw.Status != 200) return raw;
        var html = Encoding.UTF8.GetString(raw.Body);
        var headAt = html.IndexOf("<head>", StringComparison.OrdinalIgnoreCase);
        if (headAt >= 0) html = html.Insert(headAt + "<head>".Length, "\n<script>" + head + "</script>\n");
        if (tail is not null)
        {
            var bodyEnd = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            if (bodyEnd >= 0) html = html.Insert(bodyEnd, "<script>" + tail + "</script>\n");
        }
        return new PaneResponse(200, "text/html; charset=utf-8", Encoding.UTF8.GetBytes(html));
    }

    private static PaneResponse NotFound() => new(404, "text/plain; charset=utf-8", Array.Empty<byte>());

    /// <summary>The MIME table the macOS scheme handlers use, for the extensions a bundle carries.</summary>
    public static string MimeType(string extension) => extension.ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8",
        ".js" or ".mjs" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".json" or ".map" => "application/json; charset=utf-8",
        ".svg" => "image/svg+xml",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".ico" => "image/x-icon",
        ".woff" => "font/woff",
        ".woff2" => "font/woff2",
        ".ttf" => "font/ttf",
        ".mp3" => "audio/mpeg",
        ".ogg" => "audio/ogg",
        ".wav" => "audio/wav",
        ".txt" or ".story" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    };

    // ── the injected scripts ────────────────────────────────────────────────

    /// <summary>The script-message handler name this host registers on the WKWebView.</summary>
    public const string HostHandlerName = "sharpeeAvaloniaHost";

    /// <summary>
    /// The host shim. The client and the surface post to
    /// window.webkit.messageHandlers.&lt;name&gt;.postMessage — the WebKit-shaped door
    /// ADR-341 D3's contract will formalize. Here each post is forwarded to
    /// Avalonia's own web-message bridge, whichever of the candidate shapes this
    /// backend provides; the one that took is recorded on window.__sharpeeShim so
    /// the probe can read it back rather than the host assuming it.
    /// </summary>
    public const string HostShimScript = @"
(function () {
  // Audio off before the client boots, on every pane this host serves — not just
  // the testing page. The client awaits AudioContext.resume() on each command and
  // WebKit only resolves that after a real user gesture, so a live context both
  // hangs synthetic replay and plays the whole walkthrough out loud.
  try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch (e) {}
  // Removing AudioContext is not enough: the client still creates media elements
  // and the bundle's ambience plays through them. A testing pane makes no sound.
  try { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); }, pause: function () {}, addEventListener: function () {} }; }; } catch (e) {}
  try { window.confirm = function () { return true; }; } catch (e) {}

  var native = null, via = 'none';
  try {
    var mh = window.webkit && window.webkit.messageHandlers;
    if (mh && mh['" + HostHandlerName + @"'] && typeof mh['" + HostHandlerName + @"'].postMessage === 'function') {
      native = function (t) { mh['" + HostHandlerName + @"'].postMessage(t); };
      via = 'webkit.messageHandlers.' + '" + HostHandlerName + @"';
    }
  } catch (e) {}
  if (!native) {
    try {
      if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
        native = function (t) { window.chrome.webview.postMessage(t); };
        via = 'chrome.webview';
      }
    } catch (e) {}
  }
  if (!native) { native = function () {}; via = 'missing'; }

  function post(handler, body) {
    var text = (typeof body === 'string') ? body : JSON.stringify(body);
    native(JSON.stringify({ handler: handler, body: text }));
  }
  function shim(name) { return { postMessage: function (body) { post(name, body); } }; }

  var handlers = {
    turnEvents: shim('turnEvents'),
    testingSurface: shim('testingSurface'),
    testingConsole: shim('testingConsole'),
    docsTab: shim('docsTab')
  };

  // In a WKWebView the native window.webkit.messageHandlers is read-only, so the
  // whole window.webkit object is replaced. The native handler was captured above,
  // before the replacement, which is why the post door survives it.
  var strategy = 'none';
  try {
    Object.defineProperty(window, 'webkit', { value: { messageHandlers: handlers }, configurable: true, writable: true });
    strategy = 'defineProperty';
  } catch (e1) {
    try { window.webkit = { messageHandlers: handlers }; strategy = 'assign'; } catch (e2) {}
  }

  window.__sharpeeShim = {
    via: via,
    strategy: strategy,
    installed: !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.turnEvents === handlers.turnEvents)
  };

  // The one door in. The host calls this from InvokeScript; there is no parent
  // frame here, so nothing listens on window 'message'.
  window.__sharpeeHost = function (m) {
    try {
      if (!m || !m.type) return 'no-type';
      if (m.type === 'deliver') {
        var s = window.__sharpeeTestingSurface;
        if (s && typeof s.deliver === 'function') { s.deliver(m.record); return 'delivered'; }
        return 'no-surface';
      }
      if (m.type === 'type') {
        var input = document.getElementById('command-input');
        if (!input) return 'no-input';
        input.value = m.command;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        return 'typed';
      }
      return 'unknown';
    } catch (err) {
      post('testingConsole', 'host: ' + (err && err.message ? err.message : String(err)));
      return 'error';
    }
  };

  window.addEventListener('error', function (e) { post('testingConsole', e.message || 'Error'); });
})();
";

    /// <summary>The document-start boot the macOS testing surface installs (seed, no AudioContext, confirm true, cleared storage, deliver shim, session).</summary>
    public static string BootScript(string sessionJson) => @"
(function () {
  var session = " + sessionJson + @";
  window.__SHARPEE_PLAY_SEED__ = session.seed;
  try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch (e) {}
  try { window.confirm = function () { return true; }; } catch (e) {}
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  window.__sharpeeTestingSurface = { q: [], deliver: function (record) { this.q.push(record); } };
  window.__SHARPEE_TESTING_SESSION__ = session;
})();
";

    /// <summary>Loads surface.css and surface.js from the reserved prefix once the DOM exists.</summary>
    public const string AssetInjectorScript = @"
(function () {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '" + TestingSurfacePrefix + @"surface.css';
  document.head.appendChild(link);
  var script = document.createElement('script');
  script.src = '" + TestingSurfacePrefix + @"surface.js';
  document.body.appendChild(script);
})();
";

    /// <summary>Reports the docs tab's boot to the host: title, nav entry count, and the version banner text.</summary>
    public const string DocsLoadedScript = @"
window.addEventListener('load', function () {
  setTimeout(function () {
    var nav = document.getElementById('nav');
    var links = nav ? nav.querySelectorAll('a').length : 0;
    var version = document.getElementById('version');
    window.webkit.messageHandlers.docsTab.postMessage(JSON.stringify({ type: 'loaded', title: document.title, navLinks: links, version: version ? version.textContent : '' }));
  }, 800);
});
";
}
