// The host half of the testing round trip: hands each turn record the play client
// posts back into the testing surface, one at a time and in arrival order.
//
// ORDER IS THE CONTRACT, not a nicety. The surface folds records by ordinal and forks a
// fresh boot when the sequence does not match, so two deliveries in flight at once make
// it replay the tree from the start — the defect the Phase 1 probe hit and fixed with
// this same queue. Every delivery therefore waits for the previous round trip to return.
//
// IT NAMES NO MECHANISM. Delivery goes through IPaneDoor.EvaluateAsync, so the relay is
// the same on every platform slice; only the door underneath it differs.
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
    private readonly IPaneDoor _door;
    private readonly Action<string>? _log;
    private readonly Action<Func<Task>> _schedule;
    private readonly Queue<string> _queue = new();
    private readonly object _gate = new();
    private bool _draining;

    /// <param name="door">The open door to evaluate the delivery script through.</param>
    /// <param name="log">Optional sink for delivery failures; nothing is logged per record.</param>
    /// <param name="schedule">
    /// How to start draining. The default posts to the UI thread, because evaluating script
    /// in a web view is a UI-thread operation on every backend; a test supplies an inline
    /// scheduler so ordering can be asserted without a running dispatcher.
    /// </param>
    internal PaneRelay(IPaneDoor door, Action<string>? log, Action<Func<Task>> schedule)
    {
        _door = door;
        _log = log;
        _schedule = schedule;
    }

    /// <param name="door">The open door to evaluate the delivery script through.</param>
    /// <param name="log">Optional sink for delivery failures; nothing is logged per record.</param>
    public PaneRelay(IPaneDoor door, Action<string>? log = null)
        : this(door, log, work => Dispatcher.UIThread.Post(async () => await work()))
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
    /// Delivers queued records one at a time, awaiting each round trip before dequeuing
    /// the next. A failed delivery is recorded and the queue continues: one record the
    /// page refused must not strand every record behind it.
    /// </summary>
    private async Task DrainAsync()
    {
        while (true)
        {
            string next;
            lock (_gate)
            {
                if (_queue.Count == 0)
                {
                    _draining = false;
                    return;
                }
                next = _queue.Dequeue();
            }

            try
            {
                await _door.EvaluateAsync("window.__sharpeeHost({type:'deliver',record:" + next + "})");
                Delivered++;
            }
            catch (Exception ex)
            {
                LastError = $"{ex.GetType().Name}: {ex.Message}";
                _log?.Invoke($"relay failed: {LastError}");
            }
        }
    }
}
