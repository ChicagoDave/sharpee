// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
//
// A WPF mirror of tools/ide/SharpeeIDE/Theme.swift, reproducing ADR-297's
// mechanism rather than inventing one:
//   D1 — ONE token namespace, each token a light/dark pair. No second theme
//        file, no per-view branching. A single-appearance literal in view code
//        is a defect on macOS and is treated as one here.
//   D2 — follows the system by default; System / Light / Dark is pinnable,
//        persisted, and applied BEFORE the window builds.
//   D3 — app-wide, not per-surface.
//
// The hex values are copied from Theme.swift, not re-picked, so that "the tokens
// flip live" is a claim about the real palette.

using System.Windows;
using System.Windows.Media;
using Microsoft.Win32;

namespace Adr341.WpfSpike;

public enum Appearance { System, Light, Dark }

public static class Theme
{
    // ---- the token table: name -> (light, dark). Mirrors Theme.swift. ----
    private static readonly (string Key, uint Light, uint Dark)[] Tokens =
    [
        ("RailBackground",     0xDCE0E8, 0x16171D),
        ("ProjectBackground",  0xE6E9EF, 0x262832),
        ("EditorBackground",   0xEFF1F5, 0x1E1F26),
        ("PlayBackground",     0xE6E9EF, 0x13141A),
        ("Border",             0xACB0BE, 0x3A3C48),
        ("Foreground",         0x4C4F69, 0xD8D9E0),
        ("ForegroundDim",      0x6C6F85, 0x8E90A0),
        ("ForegroundFaint",    0x9CA0B0, 0x5C5F6D),
        ("Accent",             0x1E66F5, 0x89B4FA),
        ("StatusBarText",      0xEFF1F5, 0x11131A),

        // syntax tokens — the highlighter resolves these by capture name
        ("TokenKeyword",       0x8839EF, 0xCBA6F7),
        ("TokenString",        0x40A02B, 0xA6E3A1),
        ("TokenComment",       0x8C8FA1, 0x6C7086),
        ("TokenNumber",        0xFE640B, 0xFAB387),
        ("TokenType",          0xDF8E1D, 0xF9E2AF),
        ("TokenFunction",      0x1E66F5, 0x89B4FA),

        // world map
        ("WorldSealed",            0xD20F39, 0xF38BA8),
        ("WorldUnreached",         0x7C7F93, 0x7F849C),
        ("WorldCandidate",         0xFE640B, 0xFAB387),
        ("WorldAmbiguous",         0xDF8E1D, 0xF9E2AF),
        ("WorldConnection",        0x9CA0B0, 0x585B70),
        ("WorldDoor",              0x179299, 0x94E2D5),
        ("WorldRoomFill",          0xEFF1F5, 0x1E1F26),
        ("WorldRoomFillUnreached", 0xE6E9EF, 0x181920),
        ("WorldDisplaced",         0x8839EF, 0xCBA6F7),
    ];

    private const string RegPath = @"Software\Sharpee\Adr341Spike";
    private const string RegName = "SharpeeAppearance"; // same key name as macOS

    public static event Action? Changed;

    private static Appearance _preference = Appearance.System;

    public static Appearance Preference
    {
        get => _preference;
        set
        {
            _preference = value;
            using var k = Registry.CurrentUser.CreateSubKey(RegPath);
            k?.SetValue(RegName, value.ToString());
            Apply();
        }
    }

    public static bool IsDark =>
        _preference switch
        {
            Appearance.Light => false,
            Appearance.Dark => true,
            _ => SystemPrefersDark()
        };

    /// <summary>ADR-297 D2: read the pin and paint BEFORE the window builds.</summary>
    public static void LoadAndApply()
    {
        using var k = Registry.CurrentUser.OpenSubKey(RegPath);
        if (Enum.TryParse(k?.GetValue(RegName) as string, out Appearance p)) _preference = p;
        Apply();
    }

    /// <summary>
    /// Re-resolves every token into the app resource dictionary. Consumers bind with
    /// {DynamicResource Theme.X}, so WPF repaints them on this assignment — the
    /// counterpart of AppKit re-resolving a dynamic NSColor.
    /// </summary>
    public static void Apply()
    {
        var dark = IsDark;
        var res = Application.Current.Resources;
        foreach (var (key, light, darkValue) in Tokens)
        {
            var brush = new SolidColorBrush(FromHex(dark ? darkValue : light));
            brush.Freeze();
            res[$"Theme.{key}"] = brush;
        }
        Changed?.Invoke();
    }

    public static Brush Brush(string key) => (Brush)Application.Current.Resources[$"Theme.{key}"];

    private static Color FromHex(uint v) =>
        Color.FromRgb((byte)(v >> 16), (byte)(v >> 8), (byte)v);

    private static bool SystemPrefersDark()
    {
        using var k = Registry.CurrentUser.OpenSubKey(
            @"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
        // AppsUseLightTheme: 0 = dark, 1 = light. Absent on older builds -> light.
        return k?.GetValue("AppsUseLightTheme") is int i && i == 0;
    }
}
