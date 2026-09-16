// A timestamped line log the phase record quotes verbatim.
//
// Purpose: the probe stages run asynchronously inside a GUI app, so their
// findings cannot be read from stdout alone; every line is also appended to a
// file the session reads back after the run.
// Public interface: ProbeLog (Line, Path).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Diagnostics;
using System.Text;

namespace PaneHost.Hosting;

/// <summary>Append-only run log, one line per observation, seconds since start.</summary>
public sealed class ProbeLog
{
    private readonly Stopwatch _clock = Stopwatch.StartNew();
    private readonly object _gate = new();

    public string Path { get; }

    public ProbeLog(string path)
    {
        Path = path;
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
        File.WriteAllText(path, "", new UTF8Encoding(false));
    }

    /// <summary>Appends one line to the log file and to stdout.</summary>
    public void Line(string text)
    {
        var line = $"[{_clock.Elapsed.TotalSeconds,8:F3}s] {text}";
        lock (_gate) File.AppendAllText(Path, line + "\n", new UTF8Encoding(false));
        Console.WriteLine(line);
    }
}
