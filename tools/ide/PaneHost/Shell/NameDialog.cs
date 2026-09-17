// A one-field modal: the app asks for a name and gets a name, or gets nothing.
//
// WHY IT EXISTS. `sharpee init <name>` needs a name, and a folder picker cannot supply one.
// This is the smallest dialog that lets File ▸ New Story… work end to end; it is not a
// general dialog framework and should not become one.
//
// Public interface: NameDialog.AskAsync(owner, title, prompt, placeholder).
// Owner context: tools/ide — the Avalonia desktop head's shell.

using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Layout;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>A modal prompt for a single line of text.</summary>
public sealed class NameDialog : Window
{
    private readonly TextBox _input;
    private string? _result;

    private NameDialog(string title, string prompt, string placeholder)
    {
        Title = title;
        Width = 420;
        SizeToContent = SizeToContent.Height;
        CanResize = false;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Background = ThemeTokens.EditorBackground;

        _input = new TextBox { PlaceholderText = placeholder, Margin = new Thickness(0, 8, 0, 12) };

        var ok = new Button { Content = "Create", IsDefault = true, Padding = new Thickness(14, 3) };
        var cancel = new Button { Content = "Cancel", IsCancel = true, Padding = new Thickness(14, 3) };
        ok.Click += (_, _) => Finish(_input.Text);
        cancel.Click += (_, _) => Finish(null);

        // Enter accepts from the field itself, which is where the caret already is.
        _input.KeyDown += (_, e) => { if (e.Key == Key.Enter) Finish(_input.Text); };

        Content = new StackPanel
        {
            Margin = new Thickness(16),
            Children =
            {
                new TextBlock { Text = prompt, Foreground = ThemeTokens.Foreground, FontSize = 12 },
                _input,
                new StackPanel
                {
                    Orientation = Orientation.Horizontal,
                    HorizontalAlignment = HorizontalAlignment.Right,
                    Spacing = 8,
                    Children = { cancel, ok },
                },
            },
        };

        Opened += (_, _) => _input.Focus();
    }

    /// <summary>
    /// Shows the prompt and waits for an answer.
    /// </summary>
    /// <param name="owner">The window to sit over.</param>
    /// <param name="title">The dialog's window title.</param>
    /// <param name="prompt">The line above the field.</param>
    /// <param name="placeholder">Watermark text inside the empty field.</param>
    /// <returns>The trimmed text, or null when cancelled or left blank.</returns>
    public static async Task<string?> AskAsync(Window owner, string title, string prompt, string placeholder)
    {
        var dialog = new NameDialog(title, prompt, placeholder);
        await dialog.ShowDialog(owner);
        return dialog._result;
    }

    /// <summary>Records the answer and closes; blank is the same as cancelled.</summary>
    private void Finish(string? text)
    {
        var trimmed = text?.Trim();
        _result = string.IsNullOrEmpty(trimmed) ? null : trimmed;
        Close();
    }
}
