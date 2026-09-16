// A loopback HTTP origin for the panes — ADR-341 D3's fallback shape.
//
// Avalonia's NativeWebView exposes no way to answer a web resource request
// (Phase 1 finding), so the panes cannot be served from a custom scheme the way
// the macOS app and the OpenSilver/Photino host serve them. This serves the same
// PaneServer bytes over 127.0.0.1 on an ephemeral port, behind a per-run token
// in the first path segment so another local process cannot read the story's
// files by guessing the port.
//
// Public interface: LocalOrigin (Start, Stop, BaseUri, Requests).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Net;
using System.Text;

namespace PaneHost.Hosting;

/// <summary>One served request, recorded for the phase's evidence log.</summary>
public readonly record struct OriginRequest(string Scheme, string Path, int Status, int Bytes);

/// <summary>Serves <see cref="PaneServer"/> over a token-scoped loopback origin.</summary>
public sealed class LocalOrigin : IDisposable
{
    private readonly PaneServer _panes;
    private HttpListener _listener = new();
    private readonly List<OriginRequest> _requests = new();
    private readonly object _gate = new();
    private CancellationTokenSource? _cts;

    /// <summary>The per-run secret in the first path segment. Regenerated per instance.</summary>
    public string Token { get; } = Guid.NewGuid().ToString("N");

    /// <summary>The port the listener bound to, or 0 before <see cref="Start"/>.</summary>
    public int Port { get; private set; }

    public LocalOrigin(PaneServer panes) => _panes = panes;

    /// <summary>Origin root for a pane scheme, e.g. http://127.0.0.1:PORT/TOKEN/sharpee-play/.</summary>
    public string BaseUri(string scheme) => $"http://127.0.0.1:{Port}/{Token}/{scheme}/";

    /// <summary>Every request served so far, in order.</summary>
    public IReadOnlyList<OriginRequest> Requests
    {
        get { lock (_gate) return _requests.ToArray(); }
    }

    /// <summary>
    /// Binds an ephemeral loopback port and begins accepting requests. Ports are
    /// tried in a small range because HttpListener cannot bind port 0.
    /// </summary>
    /// <exception cref="InvalidOperationException">No port in the range could be bound.</exception>
    public void Start()
    {
        for (var port = 49700; port < 49740; port++)
        {
            // A failed Start() disposes the listener, so each attempt needs its
            // own — reusing one turns the second busy port into an
            // ObjectDisposedException instead of a retry.
            _listener = new HttpListener();
            _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
            try
            {
                _listener.Start();
                Port = port;
                break;
            }
            catch (HttpListenerException)
            {
                _listener.Close();
            }
        }
        if (Port == 0) throw new InvalidOperationException("no loopback port in 49700-49739 could be bound");

        _cts = new CancellationTokenSource();
        _ = Task.Run(() => AcceptLoop(_cts.Token));
    }

    private async Task AcceptLoop(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            HttpListenerContext ctx;
            try { ctx = await _listener.GetContextAsync().ConfigureAwait(false); }
            catch { return; }
            try { Answer(ctx); } catch { /* a dead pane request is not a host failure */ }
        }
    }

    /// <summary>
    /// Answers one request: rejects anything not carrying this run's token with
    /// 403, resolves the rest through <see cref="PaneServer"/>, and records what
    /// was served.
    /// </summary>
    internal void Answer(HttpListenerContext ctx)
    {
        var raw = ctx.Request.Url?.AbsolutePath ?? "/";
        var segments = raw.TrimStart('/').Split('/', 3);

        PaneResponse response;
        var scheme = segments.Length > 1 ? segments[1] : "";
        var rest = segments.Length > 2 ? segments[2] : "";

        if (segments.Length < 2 || segments[0] != Token)
        {
            response = new PaneResponse(403, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("forbidden"));
            scheme = "-";
            rest = raw;
        }
        else
        {
            response = _panes.Resolve(scheme, $"{scheme}://{PaneServer.Host}/{rest}");
        }

        lock (_gate) _requests.Add(new OriginRequest(scheme, rest.Length == 0 ? "index.html" : rest, response.Status, response.Body.Length));

        ctx.Response.StatusCode = response.Status;
        ctx.Response.ContentType = response.ContentType;
        ctx.Response.ContentLength64 = response.Body.Length;
        ctx.Response.OutputStream.Write(response.Body, 0, response.Body.Length);
        ctx.Response.OutputStream.Close();
    }

    /// <summary>Stops accepting and releases the port.</summary>
    public void Stop()
    {
        _cts?.Cancel();
        if (_listener.IsListening) _listener.Stop();
    }

    public void Dispose()
    {
        Stop();
        _listener.Close();
        _cts?.Dispose();
    }
}
