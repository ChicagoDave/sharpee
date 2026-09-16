// The real Chord lexer, reachable from C#.
//
// `packages/chord/src/lexer.ts` is bundled (esbuild, 4 modules, 5.4 KB) into a
// line-oriented Node service and run under the vendored Node the app already
// ships. The editor colors from that token stream, so a natively-drawn editor
// does not require a second, hand-written definition of Chord syntax — the
// risk ADR-341's Context names and D4/AC-5 asks about.
//
// Public interface: ChordLexerService (Start, LexAsync, Kinds, Stop).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Diagnostics;
using System.Text.Json;

namespace PaneHost.Hosting;

/// <summary>One lex of a whole document: flat token array plus the service's own timing.</summary>
/// <param name="Tokens">Five entries per token: kind index, line, column, end line, end column (all 1-based).</param>
public readonly record struct LexResult(int TokenCount, int LineCount, double LexMs, int[] Tokens, int[] CommentLines, int PayloadBytes);

/// <summary>A long-running `node lexer-server.js` speaking one JSON object per line.</summary>
public sealed class ChordLexerService : IDisposable
{
    private readonly string _nodePath;
    private readonly string _serverPath;
    private readonly SemaphoreSlim _turn = new(1, 1);
    private Process? _process;
    private int _nextId;

    /// <summary>The token kinds, in the index order the flat array uses; empty before <see cref="StartAsync"/>.</summary>
    public IReadOnlyList<string> Kinds { get; private set; } = Array.Empty<string>();

    public ChordLexerService(string nodePath, string serverPath)
    {
        _nodePath = nodePath;
        _serverPath = serverPath;
    }

    /// <summary>
    /// Spawns the service and waits for its ready line, which carries the kind
    /// order the flat token array is encoded against.
    /// </summary>
    /// <exception cref="InvalidOperationException">The process did not start, or its first line was not the ready banner.</exception>
    public async Task StartAsync()
    {
        var start = new ProcessStartInfo
        {
            FileName = _nodePath,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        start.ArgumentList.Add(_serverPath);

        _process = Process.Start(start)
            ?? throw new InvalidOperationException($"could not start {_nodePath}");

        var banner = await _process.StandardOutput.ReadLineAsync().ConfigureAwait(false)
            ?? throw new InvalidOperationException("lexer service closed stdout before the ready line");
        using var json = JsonDocument.Parse(banner);
        if (!json.RootElement.TryGetProperty("ready", out var ready) || !ready.GetBoolean())
            throw new InvalidOperationException($"lexer service first line was not the ready banner: {banner}");

        Kinds = json.RootElement.GetProperty("kinds").EnumerateArray()
            .Select(k => k.GetString()!).ToArray();
    }

    /// <summary>
    /// Lexes a whole document. Requests are serialized: the service answers one
    /// line per request, so two in flight would interleave their replies.
    /// </summary>
    /// <exception cref="InvalidOperationException">The service exited or answered with an error.</exception>
    public async Task<LexResult> LexAsync(string text)
    {
        if (_process is null) throw new InvalidOperationException("lexer service not started");

        await _turn.WaitAsync().ConfigureAwait(false);
        try
        {
            var id = ++_nextId;
            await _process.StandardInput.WriteLineAsync(
                JsonSerializer.Serialize(new { id, text })).ConfigureAwait(false);
            await _process.StandardInput.FlushAsync().ConfigureAwait(false);

            var line = await _process.StandardOutput.ReadLineAsync().ConfigureAwait(false)
                ?? throw new InvalidOperationException("lexer service closed stdout mid-request");

            using var json = JsonDocument.Parse(line);
            var root = json.RootElement;
            if (root.TryGetProperty("error", out var error))
                throw new InvalidOperationException($"lexer service refused the request: {error.GetString()}");

            var tokens = root.GetProperty("tokens");
            var flat = new int[tokens.GetArrayLength()];
            var i = 0;
            foreach (var value in tokens.EnumerateArray()) flat[i++] = value.GetInt32();

            var comments = root.GetProperty("commentLines");
            var commentLines = new int[comments.GetArrayLength()];
            var c = 0;
            foreach (var value in comments.EnumerateArray()) commentLines[c++] = value.GetInt32();

            return new LexResult(
                root.GetProperty("tokenCount").GetInt32(),
                root.GetProperty("lineCount").GetInt32(),
                root.GetProperty("lexMs").GetDouble(),
                flat,
                commentLines,
                line.Length);
        }
        finally
        {
            _turn.Release();
        }
    }

    public void Dispose()
    {
        try
        {
            if (_process is { HasExited: false })
            {
                _process.StandardInput.Close();
                if (!_process.WaitForExit(1000)) _process.Kill(entireProcessTree: true);
            }
        }
        catch { /* already gone */ }
        _process?.Dispose();
        _turn.Dispose();
    }
}
