// ADR-409 AC-11 in the Avalonia head: the Index's Things rows show what each thing answers
// to — its aka words and the forms the compiler gave it, the jars' `jar` and `crock` marked
// worked out and the mouse's `mice`, from `singular of mice`, marked written.
//
// Real path (rule 13a): the in-repo devkit CLI's `compose --json` (packages/devkit/dist/cli.js)
// compiles the test stories `test-stories/scullery` and `test-stories/refectory`, spawned
// through NativeHostServices under `node`, and StoryIndex.Read reads the IR it printed. No
// hand-built IR. The wording is pinned against SharpeeIDETests/IndexNamingRealPathTests.swift:
// an author reading the two heads should not be told the same thing in two different ways.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json.Nodes;
using PaneHost.Hosting;
using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class IndexNamingRealPathTests
{
    /// <summary>Composes a test story with the real in-repo CLI and returns the IR it printed.</summary>
    private static async Task<JsonNode> ComposeIrAsync(string id)
    {
        var folder = Path.Combine(RepoPaths.RepoRoot, "test-stories", id);
        var story = Path.Combine(folder, id + ".story");
        Assert.True(File.Exists(story), $"test story {id} is missing at {story}");
        var cli = Path.Combine(RepoPaths.RepoRoot, "packages", "devkit", "dist", "cli.js");
        var stdout = new System.Text.StringBuilder();
        var stderr = new List<string>();
        await new NativeHostServices(null).RunAsync(RepoPaths.Node,
            new[] { cli, "compose", story, "--json" }, folder,
            line => stdout.AppendLine(line), stderr.Add, CancellationToken.None);
        var ir = JsonNode.Parse(stdout.ToString())?["ir"];
        Assert.True(ir is not null, "compose printed no IR: " + string.Join('\n', stderr));
        return ir!;
    }

    /// <summary>The Index's Things row titled <paramref name="name"/>.</summary>
    private static IndexRow ThingRow(JsonNode ir, string name)
    {
        var index = StoryIndex.Read(ir.ToJsonString());
        Assert.NotNull(index);
        var things = Assert.Single(index!.Sections, s => s.Kind == IndexSectionKind.Things);
        return Assert.Single(things.Rows, r => r.Title == name);
    }

    [Fact]
    public async Task the_jars_row_shows_its_aka_and_its_worked_out_forms()
    {
        var ir = await ComposeIrAsync("scullery");

        Assert.Equal("thing · aka crocks · also answers to jar (worked out), crock (worked out)",
            ThingRow(ir, "jars").Detail);
        Assert.Equal("thing · also answers to whetstones (worked out)", ThingRow(ir, "whetstone").Detail);
    }

    [Fact]
    public async Task the_mouse_row_marks_its_written_plural_as_written()
    {
        var ir = await ComposeIrAsync("refectory");

        Assert.Equal("thing · also answers to mice (written)", ThingRow(ir, "mouse").Detail);
        Assert.Equal("thing · aka prickets · also answers to candle (worked out), pricket (worked out)",
            ThingRow(ir, "candles").Detail);
    }

    [Fact]
    public async Task an_entity_with_no_aka_and_no_forms_has_no_naming_summary()
    {
        var ir = await ComposeIrAsync("refectory");
        var wren = (ir["entities"] as JsonArray)!.Single(e => e?["id"]?.GetValue<string>() == "wren")!;

        Assert.Null(wren["forms"]);
        Assert.Null(StoryIndex.NamingSummary(wren));
    }
}
