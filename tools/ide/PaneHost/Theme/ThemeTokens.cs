// Theme.swift's tokens, one mutable SolidColorBrush each.
//
// ADR-297's live flip is the reason the brushes are mutable and shared: every
// drawn surface holds the same instance, so changing a token's Color is the
// whole repaint path — no rebuild, no reload, no re-parse. The values are
// tools/ide/SharpeeIDE/Theme.swift's, light and dark, verbatim.
//
// Public interface: ThemeTokens (the brushes, Apply, IsDark, Changed).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using Avalonia.Media;

namespace PaneHost.Theme;

/// <summary>The IDE palette as live brushes, flipped in place between light and dark.</summary>
public static class ThemeTokens
{
    private sealed record Token(string Name, uint Light, uint Dark, SolidColorBrush Brush);

    private static readonly List<Token> All = new();

    /// <summary>Raised after every <see cref="Apply"/>, for surfaces that cache measured text.</summary>
    public static event Action? Changed;

    public static bool IsDark { get; private set; }

    private static SolidColorBrush Define(string name, uint light, uint dark)
    {
        var brush = new SolidColorBrush(FromRgb(light));
        All.Add(new Token(name, light, dark, brush));
        return brush;
    }

    private static Color FromRgb(uint rgb) =>
        Color.FromRgb((byte)(rgb >> 16), (byte)(rgb >> 8), (byte)rgb);

    // Chrome
    public static readonly SolidColorBrush RailBackground = Define("railBackground", 0xDCE0E8, 0x16171D);
    public static readonly SolidColorBrush ProjectBackground = Define("projectBackground", 0xE6E9EF, 0x262832);
    public static readonly SolidColorBrush EditorBackground = Define("editorBackground", 0xEFF1F5, 0x1E1F26);
    public static readonly SolidColorBrush PlayBackground = Define("playBackground", 0xE6E9EF, 0x13141A);
    public static readonly SolidColorBrush Border = Define("border", 0xACB0BE, 0x3A3C48);
    public static readonly SolidColorBrush Foreground = Define("foreground", 0x4C4F69, 0xD8D9E0);
    public static readonly SolidColorBrush ForegroundDim = Define("foregroundDim", 0x6C6F85, 0x8E90A0);
    public static readonly SolidColorBrush ForegroundFaint = Define("foregroundFaint", 0x9CA0B0, 0x5C5F6D);
    public static readonly SolidColorBrush Accent = Define("accent", 0x1E66F5, 0x89B4FA);
    public static readonly SolidColorBrush StatusBarText = Define("statusBarText", 0xEFF1F5, 0x11131A);

    // Syntax
    public static readonly SolidColorBrush TokenKeyword = Define("tokenKeyword", 0x8839EF, 0xCBA6F7);
    public static readonly SolidColorBrush TokenString = Define("tokenString", 0x40A02B, 0xA6E3A1);
    public static readonly SolidColorBrush TokenComment = Define("tokenComment", 0x8C8FA1, 0x6C7086);
    public static readonly SolidColorBrush TokenNumber = Define("tokenNumber", 0xFE640B, 0xFAB387);

    // World map
    public static readonly SolidColorBrush WorldSealed = Define("worldSealed", 0xD20F39, 0xF38BA8);
    public static readonly SolidColorBrush WorldUnreached = Define("worldUnreached", 0x7C7F93, 0x7F849C);
    public static readonly SolidColorBrush WorldConnection = Define("worldConnection", 0x9CA0B0, 0x585B70);
    public static readonly SolidColorBrush WorldDoor = Define("worldDoor", 0x179299, 0x94E2D5);
    public static readonly SolidColorBrush WorldRoomFill = Define("worldRoomFill", 0xEFF1F5, 0x1E1F26);
    public static readonly SolidColorBrush WorldRoomFillUnreached = Define("worldRoomFillUnreached", 0xE6E9EF, 0x181920);
    public static readonly SolidColorBrush WorldDisplaced = Define("worldDisplaced", 0x8839EF, 0xCBA6F7);

    /// <summary>The badge red the tab strip's counts use — not a Theme.swift token; the spike's own.</summary>
    public static readonly SolidColorBrush BadgeBackground = Define("badgeBackground", 0xD20F39, 0xF38BA8);

    public static int TokenCount => All.Count;

    /// <summary>The current hex value of one token, for the flip probe to read back.</summary>
    public static string HexOf(string name)
    {
        var token = All.First(t => t.Name == name);
        var c = token.Brush.Color;
        return $"#{c.R:X2}{c.G:X2}{c.B:X2}";
    }

    /// <summary>
    /// Flips every token in place. Each brush instance is retained by the
    /// surfaces that drew with it, so this is the entire repaint trigger.
    /// </summary>
    public static void Apply(bool dark)
    {
        foreach (var token in All) token.Brush.Color = FromRgb(dark ? token.Dark : token.Light);
        IsDark = dark;
        Changed?.Invoke();
    }
}
