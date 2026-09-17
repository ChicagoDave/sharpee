// The pane door: how this platform serves the three web panes to a native web view,
// and how host and page talk once it is open. ADR-341 D3's contract module.
//
// ONE CONTRACT, ONE BACKEND PER PLATFORM. D3 records that the mechanism differs
// outright and that no common one exists: macOS has no way to answer a web
// resource request, so it uses a token-scoped loopback origin; Windows uses
// ICoreWebView2_3::SetVirtualHostNameToFolderMapping; Linux uses
// webkit_web_context_register_uri_scheme. The point of this interface is that the
// shell names none of them — it opens a door, asks for a pane's Uri, and sends and
// receives messages. Each platform slice adds its own implementation behind it.
//
// WHAT IS NOT PLATFORM-VARYING LIVES ELSEWHERE. PaneServer resolves a pane path to
// bytes and injects the host shim; that is identical everywhere and a door serves
// it rather than reimplementing it.
//
// Public interface: IPaneDoor, PaneMessage.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using Avalonia.Controls;

namespace PaneHost.Hosting;

/// <summary>One message from a pane, as the injected host shim addressed it.</summary>
/// <param name="Handler">The shim handler name — turnEvents, testingSurface, testingConsole, docsTab.</param>
/// <param name="Body">The payload the pane posted, still as text.</param>
public readonly record struct PaneMessage(string Handler, string Body);

/// <summary>
/// A platform's way of serving the panes to a native web view and exchanging messages
/// with them. One implementation per platform; the shell depends only on this.
/// </summary>
public interface IPaneDoor : IDisposable
{
    /// <summary>The mechanism this door uses, named for the evidence log.</summary>
    string Mechanism { get; }

    /// <summary>True between <see cref="Open"/> and <see cref="Dispose"/>.</summary>
    bool IsOpen { get; }

    /// <summary>
    /// Wires the door to the view, before the view's underlying web view is created.
    /// Some backends must name their script-message handler at that moment and cannot
    /// do it afterwards, which is why this is separate from <see cref="Open"/>.
    /// </summary>
    /// <param name="web">The view the panes will be shown in.</param>
    void Configure(NativeWebView web);

    /// <summary>Starts serving <paramref name="panes"/>.</summary>
    /// <param name="panes">Resolves a pane path to bytes; platform-neutral.</param>
    /// <exception cref="InvalidOperationException">The door is already open.</exception>
    void Open(PaneServer panes);

    /// <summary>Where a pane lives once the door is open.</summary>
    /// <param name="scheme">A <see cref="PaneServer"/> scheme constant.</param>
    /// <param name="page">The page within that scheme, e.g. "index.html".</param>
    /// <returns>A Uri the view can navigate to.</returns>
    /// <exception cref="InvalidOperationException">The door is not open.</exception>
    Uri PaneUri(string scheme, string page);

    /// <summary>Raised for each message a pane posts through the injected shim.</summary>
    event EventHandler<PaneMessage>? MessageReceived;

    /// <summary>Runs script in the open pane — the host-to-page direction.</summary>
    /// <param name="script">JavaScript to evaluate.</param>
    /// <returns>The result as text, or null.</returns>
    Task<string?> EvaluateAsync(string script);
}
