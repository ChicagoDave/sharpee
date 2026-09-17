// A loopback HTTP origin for the panes — ADR-341 D3's macOS shape.
//
// Avalonia's NativeWebView exposes no way to answer a web resource request (Phase 1
// finding), so the panes cannot be served from a custom scheme the way the macOS app and
// the OpenSilver/Photino host serve them. This serves the same PaneServer bytes over
// 127.0.0.1 on an ephemeral port, behind a per-run token in the first path segment so
// another local process cannot read the story's files by guessing the port.
//
// IT SPEAKS HTTP ITSELF RATHER THAN USING HttpListener, and that is not a preference.
// `HttpListener.Start()` resolves this machine's own hostname, and inside a packaged .app
// on macOS 26 that lookup needs Local Network Access permission: with none granted it
// blocks for 35 SECONDS and then throws, on every open, while the identical binary run
// outside a bundle answers in under a millisecond (measured 2026-09-17, GH #483 —
// `Dns.GetHostEntry("MacBook-Pro.local")` 35,011 ms / 0 addresses inside the bundle).
// Opening a story is not allowed to cost 35 seconds, and an app that serves only 127.0.0.1
// has no business asking for permission to find devices on the local network — so nothing
// here resolves a name. The listener binds IPAddress.Loopback directly.
//
// The HTTP it speaks is deliberately the smallest thing the panes need: GET and HEAD,
// one request per connection, plus single-range requests so media elements can seek.
//
// Public interface: LocalOrigin (Start, Stop, BaseUri, Requests, Port, Token).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6 evaluation
// spike 2026-09-16; the HTTP layer replaced HttpListener 2026-09-17.

using System.Net;
using System.Net.Sockets;
using System.Text;

namespace PaneHost.Hosting;

/// <summary>One served request, recorded for the phase's evidence log.</summary>
public readonly record struct OriginRequest(string Scheme, string Path, int Status, int Bytes);

/// <summary>Serves <see cref="PaneServer"/> over a token-scoped loopback origin.</summary>
public sealed class LocalOrigin : IDisposable
{
    private readonly PaneServer _panes;
    private readonly List<OriginRequest> _requests = new();
    private readonly object _gate = new();
    private TcpListener? _listener;
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
    /// Binds an ephemeral loopback port and begins accepting connections.
    /// </summary>
    /// <remarks>Port 0 lets the OS choose, which cannot collide with another run.</remarks>
    /// <exception cref="SocketException">The loopback port could not be bound.</exception>
    public void Start()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        _listener = listener;
        Port = ((IPEndPoint)listener.LocalEndpoint).Port;

        _cts = new CancellationTokenSource();
        _ = Task.Run(() => AcceptLoop(listener, _cts.Token));
    }

    /// <summary>Accepts connections until stopped, serving each one on its own task.</summary>
    private async Task AcceptLoop(TcpListener listener, CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            TcpClient client;
            try { client = await listener.AcceptTcpClientAsync(token).ConfigureAwait(false); }
            catch { return; }

            // A pane loads dozens of files; serving them one connection at a time would
            // serialize the whole page load behind the slowest read.
            _ = Task.Run(async () =>
            {
                using (client)
                {
                    try { await ServeAsync(client).ConfigureAwait(false); }
                    catch { /* a dead pane connection is not a host failure */ }
                }
            }, token);
        }
    }

    /// <summary>
    /// Reads one request from the connection, answers it, and closes.
    /// </summary>
    /// <param name="client">The accepted connection.</param>
    private async Task ServeAsync(TcpClient client)
    {
        client.NoDelay = true;
        var stream = client.GetStream();

        var (method, target, range) = await ReadRequestAsync(stream).ConfigureAwait(false);
        if (method is null || target is null) return;

        var response = Answer(target);
        await WriteResponseAsync(stream, method, response, range).ConfigureAwait(false);
    }

    /// <summary>
    /// Reads the request line and headers, stopping at the blank line.
    /// </summary>
    /// <param name="stream">The connection's stream.</param>
    /// <returns>The method, the request target, and a parsed Range header if present.</returns>
    private static async Task<(string? Method, string? Target, (long From, long? To)? Range)> ReadRequestAsync(NetworkStream stream)
    {
        // 16 KiB is far more than a pane's request line and headers, and is the point at
        // which something is sending us something we should not be answering.
        var buffer = new byte[16 * 1024];
        var filled = 0;
        var headerEnd = -1;

        while (filled < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(filled)).ConfigureAwait(false);
            if (read == 0) break;
            filled += read;

            headerEnd = IndexOfHeaderEnd(buffer, filled);
            if (headerEnd >= 0) break;
        }
        if (headerEnd < 0) return (null, null, null);

        var head = Encoding.ASCII.GetString(buffer, 0, headerEnd);
        var lines = head.Split("\r\n");
        var requestLine = lines[0].Split(' ');
        if (requestLine.Length < 2) return (null, null, null);

        (long, long?)? range = null;
        foreach (var line in lines.Skip(1))
        {
            if (!line.StartsWith("Range:", StringComparison.OrdinalIgnoreCase)) continue;
            range = ParseRange(line["Range:".Length..].Trim());
            break;
        }

        return (requestLine[0], requestLine[1], range);
    }

    /// <summary>Finds the CRLFCRLF that ends the header block, or -1 while it has not arrived.</summary>
    private static int IndexOfHeaderEnd(byte[] buffer, int length)
    {
        for (var i = 3; i < length; i++)
        {
            if (buffer[i] == '\n' && buffer[i - 1] == '\r' && buffer[i - 2] == '\n' && buffer[i - 3] == '\r')
                return i - 3;
        }
        return -1;
    }

    /// <summary>Parses the one range form media elements actually send: `bytes=from-` or `bytes=from-to`.</summary>
    private static (long From, long? To)? ParseRange(string value)
    {
        if (!value.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase)) return null;
        var spec = value["bytes=".Length..].Split(',')[0].Trim();
        var dash = spec.IndexOf('-');
        if (dash <= 0) return null;

        if (!long.TryParse(spec[..dash], out var from)) return null;
        var tail = spec[(dash + 1)..];
        if (tail.Length == 0) return (from, null);
        return long.TryParse(tail, out var to) ? (from, to) : null;
    }

    /// <summary>
    /// Answers one request target: rejects anything not carrying this run's token with 403,
    /// resolves the rest through <see cref="PaneServer"/>, and records what was served.
    /// </summary>
    /// <param name="target">The request target, e.g. /TOKEN/sharpee-play/index.html?x=1.</param>
    internal PaneResponse Answer(string target)
    {
        var path = target;
        var query = path.IndexOfAny(new[] { '?', '#' });
        if (query >= 0) path = path[..query];

        var segments = path.TrimStart('/').Split('/', 3);

        PaneResponse response;
        var scheme = segments.Length > 1 ? segments[1] : "";
        var rest = segments.Length > 2 ? segments[2] : "";

        if (segments.Length < 2 || segments[0] != Token)
        {
            response = new PaneResponse(403, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("forbidden"));
            scheme = "-";
            rest = path;
        }
        else
        {
            response = _panes.Resolve(scheme, $"{scheme}://{PaneServer.Host}/{rest}");
        }

        lock (_gate) _requests.Add(new OriginRequest(scheme, rest.Length == 0 ? "index.html" : rest, response.Status, response.Body.Length));
        return response;
    }

    /// <summary>
    /// Writes the response, honouring HEAD and a single byte range.
    /// </summary>
    /// <param name="stream">The connection's stream.</param>
    /// <param name="method">The request method.</param>
    /// <param name="response">What <see cref="PaneServer"/> resolved.</param>
    /// <param name="range">The requested byte range, or null.</param>
    private static async Task WriteResponseAsync(
        NetworkStream stream, string method, PaneResponse response, (long From, long? To)? range)
    {
        var body = response.Body;
        var status = response.Status;
        var offset = 0;
        var count = body.Length;
        string? contentRange = null;

        if (status == 200 && range is { } asked && asked.From < body.Length)
        {
            var last = asked.To is { } to ? Math.Min(to, body.Length - 1) : body.Length - 1;
            if (last >= asked.From)
            {
                offset = (int)asked.From;
                count = (int)(last - asked.From + 1);
                contentRange = $"bytes {asked.From}-{last}/{body.Length}";
                status = 206;
            }
        }

        var head = new StringBuilder();
        head.Append("HTTP/1.1 ").Append(status).Append(' ').Append(ReasonPhrase(status)).Append("\r\n");
        head.Append("Content-Type: ").Append(response.ContentType).Append("\r\n");
        head.Append("Content-Length: ").Append(count).Append("\r\n");
        head.Append("Accept-Ranges: bytes\r\n");
        if (contentRange is not null) head.Append("Content-Range: ").Append(contentRange).Append("\r\n");
        // One request per connection keeps the server to what the panes need; a client that
        // asked for keep-alive is told plainly that it is not getting it.
        head.Append("Connection: close\r\n\r\n");

        await stream.WriteAsync(Encoding.ASCII.GetBytes(head.ToString())).ConfigureAwait(false);
        if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase) && count > 0)
            await stream.WriteAsync(body.AsMemory(offset, count)).ConfigureAwait(false);
        await stream.FlushAsync().ConfigureAwait(false);
    }

    private static string ReasonPhrase(int status) => status switch
    {
        200 => "OK",
        206 => "Partial Content",
        403 => "Forbidden",
        404 => "Not Found",
        _ => "OK",
    };

    /// <summary>Stops accepting and releases the port.</summary>
    public void Stop()
    {
        _cts?.Cancel();
        _listener?.Stop();
        _listener = null;
        Port = 0;
    }

    public void Dispose()
    {
        Stop();
        _cts?.Dispose();
    }
}
