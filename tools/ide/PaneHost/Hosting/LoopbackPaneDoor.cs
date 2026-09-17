// The macOS pane door: a token-scoped loopback origin.
//
// ADR-341 D3 records that macOS has no custom-scheme or virtual-host mechanism on
// this backend — Avalonia's NativeWebView exposes no way to answer a web resource
// request — so unlike Windows and Linux there is no "real door" to prefer over
// this one. It IS the macOS answer, not a fallback, and the probe's
// `navigationSucceeded=False` for sharpee-play:// is that finding reproducing,
// not a defect.
//
// Public interface: LoopbackPaneDoor.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using System.Text.Json.Nodes;
using Avalonia.Controls;
using Avalonia.Platform;

namespace PaneHost.Hosting;

/// <summary>Serves the panes over <see cref="LocalOrigin"/> and bridges WKWebView messaging.</summary>
public sealed class LoopbackPaneDoor : IPaneDoor
{
    private LocalOrigin? _origin;
    private NativeWebView? _web;

    public string Mechanism => "token-scoped loopback origin (127.0.0.1, per-run token)";

    public bool IsOpen => _origin is not null;

    public event EventHandler<PaneMessage>? MessageReceived;

    public void Configure(NativeWebView web)
    {
        _web = web;
        web.EnvironmentRequested += OnEnvironmentRequested;
        web.WebMessageReceived += OnWebMessageReceived;
    }

    public void Open(PaneServer panes)
    {
        if (_origin is not null)
            throw new InvalidOperationException("this pane door is already open.");

        var origin = new LocalOrigin(panes);
        origin.Start();
        _origin = origin;
    }

    public void Close()
    {
        _origin?.Stop();
        _origin = null;
    }

    public Uri PaneUri(string scheme, string page)
    {
        var origin = _origin
            ?? throw new InvalidOperationException("the pane door is not open; call Open first.");
        return new Uri(origin.BaseUri(scheme) + page);
    }

    public Task<string?> EvaluateAsync(string script) =>
        _web is { } web
            ? web.InvokeScript(script).ContinueWith(t => t.Result?.ToString())
            : Task.FromResult<string?>(null);

    /// <summary>
    /// Names the script-message handler before the WKWebView exists. WebKit will not
    /// accept a handler registered after creation, so this cannot move into Open.
    /// </summary>
    private void OnEnvironmentRequested(object? sender, EventArgs e)
    {
        if (e is AppleWKWebViewEnvironmentRequestedEventArgs apple)
        {
            apple.ScriptHandlerMessageName = PaneServer.HostHandlerName;
        }
    }

    /// <summary>
    /// Unwraps the envelope the injected shim posts — {handler, body} — into a
    /// <see cref="PaneMessage"/>. A body that is not our envelope is surfaced raw
    /// under handler "?" rather than dropped, so an unexpected poster is visible.
    /// </summary>
    private void OnWebMessageReceived(object? sender, EventArgs e)
    {
        var body = (e as dynamic)?.Body as string;
        if (body is null) return;

        string handler = "?", inner = body;
        try
        {
            var node = JsonNode.Parse(body);
            handler = node?["handler"]?.GetValue<string>() ?? "?";
            inner = node?["body"]?.GetValue<string>() ?? body;
        }
        catch { /* not our envelope; surface it raw */ }

        MessageReceived?.Invoke(this, new PaneMessage(handler, inner));
    }

    public void Dispose()
    {
        if (_web is { } web)
        {
            web.EnvironmentRequested -= OnEnvironmentRequested;
            web.WebMessageReceived -= OnWebMessageReceived;
            _web = null;
        }
        Close();
    }
}
