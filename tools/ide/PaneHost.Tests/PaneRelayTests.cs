// Tests for the relay's contract: records reach the page in the order they were posted,
// one at a time, and a refused delivery does not strand the ones behind it.
//
// STUB JUSTIFICATION (rule 13a). The door here is a recording IPaneDoor rather than the
// real LoopbackPaneDoor, because the real one's EvaluateAsync needs a constructed Avalonia
// view and a running UI thread — neither exists in a headless suite. What is under test is
// the relay's own ordering and error handling, not the door. The REAL-PATH TEST that backs
// it is the `--app-exit-state` run inside the installed bundle, which drives this same
// class against the real door and the real testing surface: 268 turn records posted by the
// real client, all 268 delivered, no delivery errors (2026-09-17).
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using PaneHost.Hosting;

namespace PaneHost.Tests;

public sealed class PaneRelayTests
{
    /// <summary>Records the scripts it is asked to evaluate, in the order they arrive.</summary>
    private sealed class RecordingDoor : IPaneDoor
    {
        private readonly Func<string, Task<string?>>? _onEvaluate;

        public RecordingDoor(Func<string, Task<string?>>? onEvaluate = null) => _onEvaluate = onEvaluate;

        public List<string> Evaluated { get; } = new();
        public int InFlight { get; private set; }
        public int MaxInFlight { get; private set; }

        public string Mechanism => "recording";
        public bool IsOpen => true;

        // The relay never raises this; the interface requires it, so it is declared and
        // left alone rather than pretended into use.
        public event EventHandler<PaneMessage>? MessageReceived
        {
            add { }
            remove { }
        }

        public async Task<string?> EvaluateAsync(string script)
        {
            InFlight++;
            MaxInFlight = Math.Max(MaxInFlight, InFlight);
            try
            {
                Evaluated.Add(script);
                return _onEvaluate is null ? null : await _onEvaluate(script);
            }
            finally
            {
                InFlight--;
            }
        }

        public void Configure(Avalonia.Controls.NativeWebView web) => throw new NotSupportedException();
        public void Open(PaneServer panes) { }
        public void Close() { }
        public Uri PaneUri(string scheme, string page) => new("http://127.0.0.1/");
        public void Dispose() { }
    }

    /// <summary>Runs the drain inline and waits for it, so a test asserts on a settled relay.</summary>
    private static PaneRelay Relay(RecordingDoor door, List<string>? log = null) =>
        new(door, log is null ? null : log.Add, work => work().GetAwaiter().GetResult());

    [Fact]
    public void records_reach_the_page_in_the_order_they_were_posted()
    {
        // Order is the contract: the surface folds by ordinal and forks a fresh boot when
        // the sequence does not match, so out-of-order delivery replays the whole tree.
        var door = new RecordingDoor();
        var relay = Relay(door);

        relay.Enqueue("""{"turn":1}""");
        relay.Enqueue("""{"turn":2}""");
        relay.Enqueue("""{"turn":3}""");

        Assert.Equal(3, door.Evaluated.Count);
        Assert.Equal(3, relay.Delivered);
        Assert.Contains("""{"turn":1}""", door.Evaluated[0]);
        Assert.Contains("""{"turn":2}""", door.Evaluated[1]);
        Assert.Contains("""{"turn":3}""", door.Evaluated[2]);
        Assert.All(door.Evaluated, script => Assert.Contains("__sharpeeHost({type:'deliver'", script));
    }

    [Fact]
    public void a_record_enqueued_mid_delivery_is_queued_behind_the_one_in_flight()
    {
        // The case the queue exists for: a post arriving while a delivery is still running.
        RecordingDoor? door = null;
        PaneRelay? relay = null;
        var reentered = false;

        door = new RecordingDoor(script =>
        {
            if (!reentered && script.Contains("""{"turn":1}""", StringComparison.Ordinal))
            {
                reentered = true;
                relay!.Enqueue("""{"turn":2}""");
            }
            return Task.FromResult<string?>(null);
        });
        relay = Relay(door);

        relay.Enqueue("""{"turn":1}""");

        Assert.Equal(2, door.Evaluated.Count);
        Assert.Contains("""{"turn":1}""", door.Evaluated[0]);
        Assert.Contains("""{"turn":2}""", door.Evaluated[1]);
        // One at a time is the point: two deliveries overlapping is the defect this prevents.
        Assert.Equal(1, door.MaxInFlight);
    }

    [Fact]
    public void a_refused_delivery_is_recorded_and_the_queue_continues()
    {
        var log = new List<string>();
        var door = new RecordingDoor(script =>
            script.Contains("""{"turn":2}""", StringComparison.Ordinal)
                ? throw new InvalidOperationException("the page refused it")
                : Task.FromResult<string?>(null));
        var relay = Relay(door, log);

        relay.Enqueue("""{"turn":1}""");
        relay.Enqueue("""{"turn":2}""");
        relay.Enqueue("""{"turn":3}""");

        Assert.Equal(3, door.Evaluated.Count);
        Assert.Equal(2, relay.Delivered);
        Assert.NotNull(relay.LastError);
        Assert.Contains("the page refused it", relay.LastError!);
        Assert.Contains(log, line => line.StartsWith("relay failed:", StringComparison.Ordinal));
    }

    [Fact]
    public void a_relay_that_has_delivered_nothing_reports_no_error()
    {
        var relay = Relay(new RecordingDoor());

        Assert.Equal(0, relay.Delivered);
        Assert.Null(relay.LastError);
    }
}
