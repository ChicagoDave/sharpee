// The host half of the testing round trip: hands the turn records the play client
// posts back into the testing surface, in arrival order.
//
// ORDER IS THE CONTRACT, not a nicety. The surface folds records by ordinal and forks a
// fresh boot when the sequence does not match, so two deliveries in flight at once make
// it replay the tree from the start — the defect the Phase 1 probe hit and fixed with
// this same queue. Only one delivery is ever in flight.
//
// WHAT IS IN FLIGHT IS A BATCH, NOT A RECORD. Awaiting a round trip per record gave each
// one its own dispatcher turn and its own paint, so a boot replay's 268 records arrived
// as 268 visible steps instead of the burst the shipping app produces — it posts each
// record without awaiting and WebKit coalesces them (SharpeeIDE/TestingSurface/
// TestingSurfaceViewController.swift, forwardToSurface). Draining the whole queue into a
// single script keeps the order the surface requires and restores the one paint.
//
// IT NAMES NO MECHANISM AND NO VIEW. Delivery is a delegate the shell supplies — in
// practice the door evaluating script in the testing pane's own view — so the relay is the
// same on every platform slice, and it does not care that the shell now keeps one view per
// pane rather than re-navigating a single one.
//
// Public interface: PaneRelay — Enqueue, Delivered, LastError.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using Avalonia.Threading;

namespace PaneHost.Hosting;

/// <summary>
/// Serializes host→page deliveries of turn records to the testing surface, so records
/// reach it in the order the client posted them.
/// </summary>
public sealed class PaneRelay
{
    private readonly Func<string, Task<string?>> _deliver;
    private readonly Action<string>? _log;
    private readonly Action<Func<Task>> _schedule;
    private readonly Func<IReadOnlyList<string>, string> _script;
    private readonly Queue<string> _queue = new();
    private readonly object _gate = new();
    private bool _draining;

    /// <param name="deliver">Runs one script in the testing pane and answers when it returns.</param>
    /// <param name="log">Optional sink for delivery failures; nothing is logged per record.</param>
    /// <param name="schedule">
    /// How to start draining. The default posts to the UI thread, because evaluating script
    /// in a web view is a UI-thread operation on every backend; a test supplies an inline
    /// scheduler so ordering can be asserted without a running dispatcher.
    /// </param>
    internal PaneRelay(
        Func<string, Task<string?>> deliver,
        Action<string>? log,
        Action<Func<Task>> schedule,
        Func<IReadOnlyList<string>, string>? script = null)
    {
        _deliver = deliver;
        _log = log;
        _schedule = schedule;
        _script = script ?? TurnRecordBatch;
    }

    /// <summary>
    /// The default payload: a batch of turn records folded into the testing surface.
    /// </summary>
    /// <param name="batch">Turn records as the pane posted them — each one JSON text.</param>
    public static string TurnRecordBatch(IReadOnlyList<string> batch) =>
        "for (var r of [" + string.Join(",", batch) + "])"
        + " window.__sharpeeHost({type:'deliver',record:r})";

    /// <param name="deliver">Runs one script in the testing pane and answers when it returns.</param>
    /// <param name="log">Optional sink for delivery failures; nothing is logged per record.</param>
    /// <param name="script">
    /// Builds the one script a batch is delivered as. Defaults to <see cref="TurnRecordBatch"/>;
    /// the run column's NDJSON stream supplies its own, because it is the same ordering and
    /// batching problem against a different page entry point.
    /// </param>
    public PaneRelay(
        Func<string, Task<string?>> deliver,
        Action<string>? log = null,
        Func<IReadOnlyList<string>, string>? script = null)
        : this(deliver, log, work => Dispatcher.UIThread.Post(async () => await work()), script)
    {
    }

    /// <summary>How many records have reached the page without the door throwing.</summary>
    public int Delivered { get; private set; }

    /// <summary>The most recent delivery failure, or null if none has occurred.</summary>
    public string? LastError { get; private set; }

    /// <summary>
    /// Queues one turn record for delivery and starts draining if nothing else is.
    /// Safe to call from any thread; delivery itself runs on the UI thread, because
    /// evaluating script in a web view is a UI-thread operation on every backend.
    /// </summary>
    /// <param name="recordJson">The turn record exactly as the pane posted it — JSON text.</param>
    public void Enqueue(string recordJson)
    {
        lock (_gate)
        {
            _queue.Enqueue(recordJson);
            if (_draining) return;
            _draining = true;
        }
        _schedule(DrainAsync);
    }

    /// <summary>
    /// Delivers everything queued in one round trip, then whatever arrived while that
    /// trip was in flight, and so on until the queue is empty. Records within a batch
    /// run in one script execution, so the page cannot paint between them and the order
    /// the client posted them in is the order the surface folds them in.
    ///
    /// A failed batch is recorded and the queue continues: records the page refused must
    /// not strand every record behind them.
    /// </summary>
    private async Task DrainAsync()
    {
        while (true)
        {
            string[] batch;
            lock (_gate)
            {
                if (_queue.Count == 0)
                {
                    _draining = false;
                    return;
                }
                batch = _queue.ToArray();
                _queue.Clear();
            }

            try
            {
                await _deliver(_script(batch));
                Delivered += batch.Length;
            }
            catch (Exception ex)
            {
                LastError = $"{ex.GetType().Name}: {ex.Message}";
                _log?.Invoke($"relay failed ({batch.Length} record(s)): {LastError}");
            }
        }
    }
}
