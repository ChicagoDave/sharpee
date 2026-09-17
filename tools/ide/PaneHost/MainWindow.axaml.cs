// The Phase 1 probe driver: asks, in order, the three questions the plan names
// for hosting a pane inside Avalonia's NativeWebView on macOS.
//
// (a) can the host supply a response to WebResourceRequested?
// (b) is there a custom-scheme or virtual-host mapping on this backend?
// (c) does a token-scoped loopback origin carry the panes, with two-way
//     messaging and the full ADR-307 testing round trip?
//
// Every answer is written to the run log, pass or fail, with the mechanism named.
//
// Public interface: MainWindow, constructed by App.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Platform;
using Avalonia.Threading;
using PaneHost.Hosting;

namespace PaneHost;

public partial class MainWindow : Window
{
    private readonly ProbeLog _log = new(Path.Combine(RepoPaths.DevOut, "probe-log.txt"));
    private readonly List<string> _turnRecords = new();
    private readonly List<string> _surfacePosts = new();
    private readonly List<string> _docsPosts = new();
    private string? _lastDocument;
    private int _resourceRequestedCount;
    private bool _lastNavigationSucceeded;
    private LocalOrigin? _origin;
    private readonly Queue<string> _relayQueue = new();
    private readonly object _relayGate = new();
    private bool _relayRunning;

    public MainWindow()
    {
        InitializeComponent();

        Web.EnvironmentRequested += OnEnvironmentRequested;
        Web.WebResourceRequested += OnWebResourceRequested;
        Web.WebMessageReceived += OnWebMessageReceived;
        Web.NavigationCompleted += (_, e) => { _lastNavigationSucceeded = e.IsSuccess; _log.Line($"nav completed: success={e.IsSuccess} uri={e.Request}"); };
        Web.NavigationStarted += (_, e) => _log.Line($"nav started: {e.Request}");
    }

    /// <summary>
    /// Names this host's script-message handler before the WKWebView is created,
    /// so the injected shim can find a deterministic post door instead of guessing.
    /// </summary>
    private void OnEnvironmentRequested(object? sender, EventArgs e)
    {
        _log.Line($"environment requested: args={e.GetType().FullName}");
        if (e is AppleWKWebViewEnvironmentRequestedEventArgs apple)
        {
            apple.ScriptHandlerMessageName = PaneServer.HostHandlerName;
            apple.EnableDevTools = true;
            // The shipping Mac app gives the testing surface a non-persistent store.
            // Avalonia's default is persistent, so without this the client's autosave
            // survives between runs and the next boot restores it — the pane replays
            // a game it was never given.
            apple.NonPersistentDataStore = true;
            _log.Line($"  ScriptHandlerMessageName := {PaneServer.HostHandlerName}; EnableDevTools := true; NonPersistentDataStore := true");
        }
    }

    /// <summary>Records that the event fired and what, if anything, it offers for answering.</summary>
    private void OnWebResourceRequested(object? sender, EventArgs e)
    {
        _resourceRequestedCount++;
        if (_resourceRequestedCount <= 3) _log.Line($"WebResourceRequested #{_resourceRequestedCount}: {e}");
    }

    /// <summary>Routes one page→host message to the collection its handler feeds.</summary>
    private void OnWebMessageReceived(object? sender, EventArgs e)
    {
        var body = (e as dynamic)?.Body as string;
        if (body is null) { _log.Line($"web message (no Body): {e.GetType().Name}"); return; }

        string handler = "?", inner = body;
        try
        {
            var node = JsonNode.Parse(body);
            handler = node?["handler"]?.GetValue<string>() ?? "?";
            inner = node?["body"]?.GetValue<string>() ?? body;
        }
        catch { /* not our envelope; log raw */ }

        switch (handler)
        {
            case "turnEvents":
                _turnRecords.Add(inner);
                if (_turnRecords.Count <= 2 || _turnRecords.Count % 10 == 0)
                    _log.Line($"pane ← turnEvents #{_turnRecords.Count}: {Trim(inner, 90)}");
                // The host is the relay: the client posts a turn record out, and the
                // surface only advances when the host hands that record back in. The
                // macOS app does this with evaluateJavaScript; here it is InvokeScript.
                RelayToSurface(inner);
                break;
            case "testingSurface":
                var text = TryReadDocumentText(inner);
                if (text is not null)
                {
                    _lastDocument = text;
                    _log.Line($"pane ← testingSurface document: {text.Length} chars");
                }
                else
                {
                    _surfacePosts.Add(inner);
                    _log.Line($"pane ← testingSurface: {Trim(inner, 120)}");
                }
                break;
            case "docsTab":
                _docsPosts.Add(inner);
                _log.Line($"pane ← docsTab: {Trim(inner, 160)}");
                break;
            default:
                _log.Line($"pane ← {handler}: {Trim(inner, 160)}");
                break;
        }
    }

    /// <summary>The document text of a {document:{text:…}} post, or null for any other post.</summary>
    private static string? TryReadDocumentText(string post)
    {
        try { return JsonNode.Parse(post)?["document"]?["text"]?.GetValue<string>(); }
        catch { return null; }
    }

    private static string Trim(string s, int n) => s.Length <= n ? s : s.Substring(0, n) + " …";

    /// <summary>
    /// Hands one turn record back into the page's surface, in arrival order.
    /// Order is the whole point: the surface folds records by ordinal and forks a
    /// fresh boot when the sequence does not match, so overlapping InvokeScript
    /// calls make it replay the tree again, and again. The queue serializes them.
    /// </summary>
    private void RelayToSurface(string recordJson)
    {
        lock (_relayGate)
        {
            _relayQueue.Enqueue(recordJson);
            if (_relayRunning) return;
            _relayRunning = true;
        }
        Dispatcher.UIThread.Post(async () => await DrainRelayAsync());
    }

    /// <summary>Delivers queued records one at a time, awaiting each round trip.</summary>
    private async Task DrainRelayAsync()
    {
        while (true)
        {
            string next;
            lock (_relayGate)
            {
                if (_relayQueue.Count == 0) { _relayRunning = false; return; }
                next = _relayQueue.Dequeue();
            }
            try { await Web.InvokeScript("window.__sharpeeHost({type:'deliver',record:" + next + "})"); }
            catch (Exception ex) { _log.Line($"relay failed: {ex.GetType().Name}: {ex.Message}"); }
        }
    }

    protected override void OnLoaded(RoutedEventArgs e)
    {
        base.OnLoaded(e);
        _ = RunProbesAsync();
    }

    private async Task RunProbesAsync()
    {
        try
        {
            await StageAdapterInfoAsync();
            await StageResponseSupplyAsync();
            await StageLoopbackOriginAsync();
            _log.Line("probe: done");
        }
        catch (Exception ex)
        {
            _log.Line($"probe: FAILED with {ex.GetType().Name}: {ex.Message}");
        }
        finally
        {
            _origin?.Stop();
            await Task.Delay(500);
            Dispatcher.UIThread.Post(() => Close());
        }
    }

    /// <summary>Records which backend is actually under test, so the verdict names it.</summary>
    private Task StageAdapterInfoAsync()
    {
        var info = Web.AdapterInfo;
        _log.Line($"── stage 0: backend ──");
        _log.Line(info is null ? "adapter: <null>" : $"adapter: type={info.Type} engine={info.Engine} version={info.Version}");
        var handle = Web.TryGetPlatformHandle();
        _log.Line($"platform handle: {handle?.GetType().Name ?? "null"} ({handle?.HandleDescriptor ?? "-"})"
                  + (handle is IAppleWKWebViewPlatformHandle apple ? $" WKWebView=0x{apple.WKWebView:x}" : ""));

        // (b) asked of the API itself: is there any response-supply or scheme hook
        // reachable from the event args this backend hands us?
        var argsType = typeof(Avalonia.Controls.WebResourceRequestedEventArgs);
        var members = argsType.GetMembers(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m is not MethodInfo mi || !mi.IsSpecialName)
            .Select(m => m.Name).OrderBy(n => n);
        _log.Line($"WebResourceRequestedEventArgs public members: {string.Join(", ", members)}");
        var requestType = typeof(Avalonia.Controls.WebViewWebResourceRequest);
        var reqMembers = requestType.GetMembers(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m is not MethodInfo mi || !mi.IsSpecialName)
            .Select(m => m.Name).OrderBy(n => n);
        _log.Line($"WebViewWebResourceRequest public members: {string.Join(", ", reqMembers)}");
        return Task.CompletedTask;
    }

    /// <summary>(a) and (b): navigate a custom scheme and see whether anything can answer it.</summary>
    private async Task StageResponseSupplyAsync()
    {
        _log.Line("── stage 1: custom scheme + WebResourceRequested (the kill question) ──");
        _resourceRequestedCount = 0;
        _lastNavigationSucceeded = false;
        Web.Navigate(new Uri($"{PaneServer.PlayScheme}://{PaneServer.Host}/index-testing.html"));
        await Task.Delay(4000);
        var title = await SafeInvoke("document.title");
        var url = await SafeInvoke("location.href");
        _log.Line($"custom scheme: navigationSucceeded={_lastNavigationSucceeded} "
                  + $"webResourceRequestedFired={_resourceRequestedCount} title={title} href={url}");
    }

    /// <summary>(c): the loopback fallback, and the full round trip on top of it.</summary>
    private async Task StageLoopbackOriginAsync()
    {
        _log.Line("── stage 2: token-scoped loopback origin ──");

        var document = File.ReadAllText(RepoPaths.RequireDevelopmentStory(RepoPaths.FernhillTests, "fernhill.tests.json"));
        var session = new JsonObject
        {
            ["story"] = "fernhill",
            ["seed"] = 42,
            ["document"] = document,
            ["mode"] = "replay",
        };
        var panes = new PaneServer(
            RepoPaths.RequireDevelopmentStory(RepoPaths.FernhillBundle, "fernhill's browser bundle"),
            RepoPaths.TestingSurface,
            RepoPaths.DocsTab,
            session.ToJsonString());

        _origin = new LocalOrigin(panes);
        _origin.Start();
        _log.Line($"origin: http://127.0.0.1:{_origin.Port}/<token>/  (token {_origin.Token.Substring(0, 8)}…)");

        // Token discipline, proven against the live listener before any pane loads.
        using (var http = new HttpClient())
        {
            var forbidden = await http.GetAsync($"http://127.0.0.1:{_origin.Port}/not-the-token/{PaneServer.PlayScheme}/index.html");
            _log.Line($"origin: untokened request → {(int)forbidden.StatusCode}");
        }

        // ── the testing pane ──
        _turnRecords.Clear();
        _surfacePosts.Clear();
        _lastDocument = null;
        Web.Navigate(new Uri(_origin.BaseUri(PaneServer.PlayScheme) + "index-testing.html"));
        await Task.Delay(12000);

        foreach (var r in _origin.Requests) _log.Line($"  origin ← {r.Scheme}/{r.Path} → {r.Status} ({r.Bytes} bytes)");

        var shim = await SafeInvoke("JSON.stringify(window.__sharpeeShim||null)");
        var boot = await SafeInvoke("JSON.stringify({"
            + "session: !!window.__SHARPEE_TESTING_SESSION__,"
            + "sessionDocChars: (window.__SHARPEE_TESTING_SESSION__&&window.__SHARPEE_TESTING_SESSION__.document||'').length,"
            + "surfaceIsReal: typeof (window.__sharpeeTestingSurface||{}).runLine === 'function',"
            + "surfaceKeys: Object.keys(window.__sharpeeTestingSurface||{}).join('|'),"
            + "surfaceScriptTags: Array.from(document.scripts).map(function(s){return s.getAttribute('src')||'inline'}).join(','),"
            + "cards: document.querySelectorAll('[class*=card]').length,"
            + "anchors: document.querySelectorAll('[data-turn]').length,"
            + "input: !!document.getElementById('command-input')"
            + "})");
        _log.Line($"testing pane: shim={shim}");
        _log.Line($"testing pane: boot={boot}");
        _log.Line($"testing pane: {_turnRecords.Count} turn record(s), {_surfacePosts.Count} surface post(s), document posted={_lastDocument is not null}");

        // ── host → page: type one command, which is what changes the tree ──
        var typed = await SafeInvoke("window.__sharpeeHost({type:'type',command:'inventory'})");
        _log.Line($"host → page: type 'inventory' → {typed}");
        await Task.Delay(4000);
        _log.Line($"after typed turn: {_turnRecords.Count} turn record(s), document posted={_lastDocument is not null}");

        if (_lastDocument is not null)
        {
            Directory.CreateDirectory(RepoPaths.DevOut);
            var written = Path.Combine(RepoPaths.DevOut, "fernhill.tests.json");
            // No BOM: the tree document is JSON the CLI walker and the surface both
            // re-read, and Encoding.UTF8 emits one, which JSON parsers reject.
            File.WriteAllText(written, _lastDocument, new UTF8Encoding(false));
            var before = JsonNode.Parse(document)!;
            var after = JsonNode.Parse(_lastDocument)!;
            _log.Line($"document: cards {before["cards"]!.AsArray().Count} → {after["cards"]!.AsArray().Count}, "
                      + $"seed {after["seed"]}, story {after["story"]}, written to {written}");
        }

        // ── localStorage across a reload ──
        await SafeInvoke("localStorage.setItem('sharpee-probe','kept')");
        Web.Navigate(new Uri(_origin.BaseUri(PaneServer.PlayScheme) + "index.html"));
        await Task.Delay(4000);
        var kept = await SafeInvoke("localStorage.getItem('sharpee-probe')");
        var playAnchors = await SafeInvoke("document.querySelectorAll('[data-turn]').length");
        _log.Line($"play pane: anchors={playAnchors} localStorage across navigation={kept}");

        // ── the docs pane ──
        _docsPosts.Clear();
        Web.Navigate(new Uri(_origin.BaseUri(PaneServer.DocsScheme) + "index.html"));
        await Task.Delay(6000);
        _log.Line($"docs pane: {_docsPosts.Count} post(s)");

        var byScheme = _origin.Requests.GroupBy(r => r.Scheme + " " + r.Status).OrderBy(g => g.Key);
        foreach (var g in byScheme) _log.Line($"origin served: {g.Key} × {g.Count()}");
        _log.Line($"origin served: {_origin.Requests.Count} request(s) total");
    }

    /// <summary>Runs script in the page, answering with its result or the failure text.</summary>
    private async Task<string> SafeInvoke(string script)
    {
        try { return (await Web.InvokeScript(script))?.ToString() ?? "null"; }
        catch (Exception ex) { return $"<{ex.GetType().Name}: {ex.Message}>"; }
    }
}
