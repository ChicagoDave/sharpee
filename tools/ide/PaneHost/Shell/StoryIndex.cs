// The story's index: every room, region, thing, person, action, phrase and hatch the IR
// declares, as rows that carry where they were written.
//
// ONE READER OF THE IR, TWO CONSUMERS. The Index tab lists these rows; the build panel's
// closing banner counts them. They were never allowed to disagree, and the cheapest way to
// keep that true is for the banner to count the rows the Index shows rather than to walk
// the IR a second time with its own copy of the bucketing rules.
//
// The rules are the shipping app's (SharpeeIDE/Compose/StoryIndex.swift):
//   - an entity is counted and listed ONCE, in the first bucket it matches: room, then
//     region, then person (or playable), then thing;
//   - a phrase key containing a dot is a platform id synthesized when prose is lowered, not
//     something an author wrote — an author cannot type a dot in a phrase name — so it is
//     neither listed nor counted;
//   - entities and actions sort by name, case-insensitively; phrases keep the IR's order;
//   - an empty section is omitted rather than shown empty.
//
// Public interface: StoryIndex.Read, StoryIndexDocument, IndexSection, IndexRow, IndexSpan.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>Where a row was written, for navigate-to-source.</summary>
/// <param name="File">
/// The source file relative to the story folder, or null when the IR names none — which is
/// how it says "the story's own file". A single-file story carries no `file` on any span,
/// so treating its absence as "no location" loses navigation for every declaration in it.
/// </param>
/// <param name="Line">1-based line.</param>
/// <param name="Column">1-based column.</param>
internal readonly record struct IndexSpan(string? File, int Line, int Column);

/// <summary>One listed declaration.</summary>
/// <param name="Title">What the author called it.</param>
/// <param name="Detail">A dim qualifier — its other kinds, "playable", a module path — or null.</param>
/// <param name="IsCode">True for rows that are identifiers rather than prose names.</param>
/// <param name="Span">Where it was written, or null when the IR carries no span.</param>
internal sealed record IndexRow(string Title, string? Detail, bool IsCode, IndexSpan? Span);

/// <summary>The seven kinds of thing a story declares, in the order they are shown.</summary>
internal enum IndexSectionKind { Rooms, Regions, Things, People, Actions, Phrases, Hatches }

/// <summary>One section of the index — never empty; an empty one is omitted instead.</summary>
internal sealed record IndexSection(IndexSectionKind Kind, IReadOnlyList<IndexRow> Rows)
{
    /// <summary>The section's heading.</summary>
    public string Title => Kind switch
    {
        IndexSectionKind.Rooms => "Rooms",
        IndexSectionKind.Regions => "Regions",
        IndexSectionKind.Things => "Things",
        IndexSectionKind.People => "People",
        IndexSectionKind.Actions => "Actions",
        IndexSectionKind.Phrases => "Phrases",
        _ => "Hatch modules",
    };

    /// <summary>The singular noun one row of this section is, for the build banner.</summary>
    public string Singular => Kind switch
    {
        IndexSectionKind.Rooms => "room",
        IndexSectionKind.Regions => "region",
        IndexSectionKind.Things => "thing",
        IndexSectionKind.People => "person",
        IndexSectionKind.Actions => "action",
        IndexSectionKind.Phrases => "phrase",
        _ => "hatch module",
    };

    /// <summary>Its plural, which is not always the singular plus an s.</summary>
    public string Plural => Kind == IndexSectionKind.People ? "people" : Singular + "s";
}

/// <summary>A story's index, as read from the IR a build emitted.</summary>
/// <param name="Title">The story's title.</param>
/// <param name="Id">Its id — what the build names its output after.</param>
/// <param name="Version">Its version, or an empty string.</param>
/// <param name="Authors">Its authors, in the order the IR lists them.</param>
/// <param name="Sections">The non-empty sections, in display order.</param>
internal sealed record StoryIndexDocument(
    string Title,
    string Id,
    string Version,
    IReadOnlyList<string> Authors,
    IReadOnlyList<IndexSection> Sections);

/// <summary>Reads a story IR into its index.</summary>
internal static class StoryIndex
{
    /// <summary>
    /// Reads the index from a story IR, or returns null when the IR cannot be parsed —
    /// a missing index is a quiet omission, never a failed build.
    /// </summary>
    /// <param name="irJson">The contents of a build's `dist/&lt;id&gt;.ir.json`.</param>
    internal static StoryIndexDocument? Read(string irJson)
    {
        JsonNode? ir;
        try { ir = JsonNode.Parse(irJson); }
        catch { return null; }
        if (ir is null) return null;

        var fields = ir["meta"]?["fields"];
        var authors = (fields?["authors"] as JsonArray)?
            .Select(a => a?.GetValue<string>())
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .Select(a => a!)
            .ToArray() ?? Array.Empty<string>();

        List<IndexRow> rooms = new(), regions = new(), things = new(), people = new();

        var entities = (ir["entities"] as JsonArray ?? new JsonArray())
            .Where(e => e is not null)
            .OrderBy(e => NameOf(e!), StringComparer.OrdinalIgnoreCase);

        foreach (var entity in entities)
        {
            var kinds = (entity!["kinds"] as JsonArray ?? new JsonArray())
                .Select(k => k?["name"]?.GetValue<string>())
                .Where(k => !string.IsNullOrEmpty(k))
                .Select(k => k!)
                .ToArray();
            var playable = entity["isPlayable"]?.GetValue<bool>() == true;
            var name = NameOf(entity);
            var span = SpanOf(entity["span"]);

            if (kinds.Contains("room"))
            {
                var extra = string.Join(", ", kinds.Where(k => k != "room"));
                rooms.Add(new IndexRow(name, extra.Length == 0 ? null : extra, false, span));
            }
            else if (kinds.Contains("region"))
            {
                regions.Add(new IndexRow(name, null, false, span));
            }
            else if (kinds.Contains("person") || playable)
            {
                people.Add(new IndexRow(name, playable ? "playable" : null, false, span));
            }
            else
            {
                var every = string.Join(", ", kinds);
                things.Add(new IndexRow(name, every.Length == 0 ? null : every, false, span));
            }
        }

        var actions = (ir["actions"] as JsonArray ?? new JsonArray())
            .Where(a => a is not null)
            .OrderBy(a => NameOf(a!), StringComparer.OrdinalIgnoreCase)
            .Select(a => new IndexRow(NameOf(a!), null, false, SpanOf(a!["span"])))
            .ToArray();

        var phrases = AuthoredPhrases(ir).ToArray();

        var hatches = (ir["hatches"] as JsonArray ?? new JsonArray())
            .Where(h => h is not null)
            .OrderBy(h => NameOf(h!), StringComparer.OrdinalIgnoreCase)
            .Select(h => new IndexRow(
                NameOf(h!), h!["modulePath"]?.GetValue<string>(), true, SpanOf(h["span"])))
            .ToArray();

        var all = new (IndexSectionKind Kind, IReadOnlyList<IndexRow> Rows)[]
        {
            (IndexSectionKind.Rooms, rooms),
            (IndexSectionKind.Regions, regions),
            (IndexSectionKind.Things, things),
            (IndexSectionKind.People, people),
            (IndexSectionKind.Actions, actions),
            (IndexSectionKind.Phrases, phrases),
            (IndexSectionKind.Hatches, hatches),
        };

        return new StoryIndexDocument(
            ir["meta"]?["title"]?.GetValue<string>() ?? "story",
            fields?["id"]?.GetValue<string>() ?? "story",
            fields?["storyVersion"]?.GetValue<string>() ?? string.Empty,
            authors,
            all.Where(s => s.Rows.Count > 0)
               .Select(s => new IndexSection(s.Kind, s.Rows))
               .ToArray());
    }

    /// <summary>
    /// The phrases an author actually wrote, in the default locale. A dotted key is a
    /// platform id from lowering prose (`hall.description`), not an authored name.
    /// </summary>
    private static IEnumerable<IndexRow> AuthoredPhrases(JsonNode ir)
    {
        var locale = ir["phrases"]?["defaultLocale"]?.GetValue<string>();
        if (locale is null || ir["phrases"]?["locales"]?[locale] is not JsonObject book)
            yield break;

        foreach (var entry in book)
        {
            if (entry.Key.Contains('.')) continue;
            // A phrase's value is an object carrying variants and a span; anything else is
            // still a phrase the author wrote, just one this reader cannot locate.
            yield return new IndexRow(entry.Key, null, true, SpanOf((entry.Value as JsonObject)?["span"]));
        }
    }

    private static string NameOf(JsonNode node) =>
        node["name"]?.GetValue<string>() ?? node["id"]?.GetValue<string>() ?? "(unnamed)";

    /// <summary>Reads a span, or null when the node carries none.</summary>
    private static IndexSpan? SpanOf(JsonNode? span)
    {
        // Indexing a JsonValue throws rather than answering null, so the shape is checked
        // before it is read — an IR that carries something unexpected here costs a row's
        // navigation, never the whole index.
        if (span is not JsonObject node) return null;
        if (node["line"]?.GetValue<int>() is not { } line) return null;
        return new IndexSpan(
            node["file"]?.GetValue<string>(),
            line,
            node["column"]?.GetValue<int>() ?? 1);
    }
}
