// Tests for the relay's contract: records reach the page in the order they were posted,
// one at a time, and a refused delivery does not strand the ones behind it.
//
// STUB JUSTIFICATION (rule 13a). Delivery here is a recording delegate rather than the real
// door evaluating script in a real view, because that needs a constructed Avalonia view and
// a running UI thread — neither exists in a headless suite. What is under test is the
// relay's own ordering and error handling, which is all it owns. The REAL-PATH TEST that backs
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
    /// <summary>Records every script it is asked to deliver, in order, one at a time.</summary>
    private sealed class RecordingPane
    {
        private readonly Func<string, Task>? _onDeliver;

        public RecordingPane(Func<string, Task>? onDeliver = null) => _onDeliver = onDeliver;

        public List<string> Delivered { get; } = new();
        public int InFlight { get; private set; }
        public int MaxInFlight { get; private set; }

        public async Task<string?> DeliverAsync(string script)
        {
            InFlight++;
            MaxInFlight = Math.Max(MaxInFlight, InFlight);
            try
            {
                Delivered.Add(script);
                if (_onDeliver is not null) await _onDeliver(script);
                return null;
            }
            finally
            {
                InFlight--;
            }
        }
    }

    /// <summary>Runs the drain inline and waits for it, so a test asserts on a settled relay.</summary>
    private static PaneRelay Relay(RecordingPane pane, List<string>? log = null) =>
        new(pane.DeliverAsync, log is null ? null : log.Add, work => work().GetAwaiter().GetResult());

    [Fact]
    public void records_reach_the_page_in_the_order_they_were_posted()
    {
        // Order is the contract: the surface folds by ordinal and forks a fresh boot when
        // the sequence does not match, so out-of-order delivery replays the whole tree.
        var pane = new RecordingPane();
        var relay = Relay(pane);

        relay.Enqueue("""{"turn":1}""");
        relay.Enqueue("""{"turn":2}""");
        relay.Enqueue("""{"turn":3}""");

        Assert.Equal(3, pane.Delivered.Count);
        Assert.Equal(3, relay.Delivered);
        Assert.Contains("""{"turn":1}""", pane.Delivered[0]);
        Assert.Contains("""{"turn":2}""", pane.Delivered[1]);
        Assert.Contains("""{"turn":3}""", pane.Delivered[2]);
        Assert.All(pane.Delivered, script => Assert.Contains("__sharpeeHost({type:'deliver'", script));
    }

    [Fact]
    public void a_record_enqueued_mid_delivery_is_queued_behind_the_one_in_flight()
    {
        // The case the queue exists for: a post arriving while a delivery is still running.
        RecordingPane? pane = null;
        PaneRelay? relay = null;
        var reentered = false;

        pane = new RecordingPane(script =>
        {
            if (!reentered && script.Contains("""{"turn":1}""", StringComparison.Ordinal))
            {
                reentered = true;
                relay!.Enqueue("""{"turn":2}""");
            }
            return Task.CompletedTask;
        });
        relay = Relay(pane);

        relay.Enqueue("""{"turn":1}""");

        Assert.Equal(2, pane.Delivered.Count);
        Assert.Contains("""{"turn":1}""", pane.Delivered[0]);
        Assert.Contains("""{"turn":2}""", pane.Delivered[1]);
        // One at a time is the point: two deliveries overlapping is the defect this prevents.
        Assert.Equal(1, pane.MaxInFlight);
    }

    [Fact]
    public void a_refused_delivery_is_recorded_and_the_queue_continues()
    {
        var log = new List<string>();
        var pane = new RecordingPane(script =>
            script.Contains("""{"turn":2}""", StringComparison.Ordinal)
                ? throw new InvalidOperationException("the page refused it")
                : Task.CompletedTask);
        var relay = Relay(pane, log);

        relay.Enqueue("""{"turn":1}""");
        relay.Enqueue("""{"turn":2}""");
        relay.Enqueue("""{"turn":3}""");

        Assert.Equal(3, pane.Delivered.Count);
        Assert.Equal(2, relay.Delivered);
        Assert.NotNull(relay.LastError);
        Assert.Contains("the page refused it", relay.LastError!);
        Assert.Contains(log, line => line.StartsWith("relay failed:", StringComparison.Ordinal));
    }

    [Fact]
    public void a_relay_that_has_delivered_nothing_reports_no_error()
    {
        var relay = Relay(new RecordingPane());

        Assert.Equal(0, relay.Delivered);
        Assert.Null(relay.LastError);
    }
}
