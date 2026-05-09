// MenuBuilder.swift
// Builds the application menu bar for Sharpee programmatically.
// Public interface: MenuBuilder.makeMainMenu(target:) returns the NSMenu to assign to NSApp.mainMenu.
// Owner context: tools/ide — App shell.

import AppKit

enum MenuBuilder {

    static func makeMainMenu(target: AnyObject) -> NSMenu {
        let mainMenu = NSMenu()
        mainMenu.addItem(makeAppMenuItem())
        mainMenu.addItem(makeFileMenuItem(target: target))
        mainMenu.addItem(makeEditMenuItem())
        mainMenu.addItem(makeWindowMenuItem())
        return mainMenu
    }

    // MARK: - App menu

    private static func makeAppMenuItem() -> NSMenuItem {
        let menu = NSMenu(title: "Sharpee")

        menu.addItem(withTitle: "About Sharpee",
                     action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
                     keyEquivalent: "")
        menu.addItem(NSMenuItem.separator())

        let services = NSMenuItem(title: "Services", action: nil, keyEquivalent: "")
        let servicesMenu = NSMenu(title: "Services")
        services.submenu = servicesMenu
        NSApp.servicesMenu = servicesMenu
        menu.addItem(services)
        menu.addItem(NSMenuItem.separator())

        menu.addItem(withTitle: "Hide Sharpee",
                     action: #selector(NSApplication.hide(_:)),
                     keyEquivalent: "h")

        let hideOthers = NSMenuItem(title: "Hide Others",
                                    action: #selector(NSApplication.hideOtherApplications(_:)),
                                    keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        menu.addItem(hideOthers)

        menu.addItem(withTitle: "Show All",
                     action: #selector(NSApplication.unhideAllApplications(_:)),
                     keyEquivalent: "")
        menu.addItem(NSMenuItem.separator())

        menu.addItem(withTitle: "Quit Sharpee",
                     action: #selector(NSApplication.terminate(_:)),
                     keyEquivalent: "q")

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - File menu

    private static func makeFileMenuItem(target: AnyObject) -> NSMenuItem {
        let menu = NSMenu(title: "File")

        let open = NSMenuItem(title: "Open Project…",
                              action: #selector(AppDelegate.openProject(_:)),
                              keyEquivalent: "o")
        open.target = target
        menu.addItem(open)
        menu.addItem(NSMenuItem.separator())

        menu.addItem(withTitle: "Close",
                     action: #selector(NSWindow.performClose(_:)),
                     keyEquivalent: "w")

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - Edit menu

    private static func makeEditMenuItem() -> NSMenuItem {
        let menu = NSMenu(title: "Edit")

        menu.addItem(withTitle: "Undo",
                     action: Selector(("undo:")),
                     keyEquivalent: "z")
        let redo = NSMenuItem(title: "Redo",
                              action: Selector(("redo:")),
                              keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        menu.addItem(redo)
        menu.addItem(NSMenuItem.separator())

        menu.addItem(withTitle: "Cut",  action: #selector(NSText.cut(_:)),  keyEquivalent: "x")
        menu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        menu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        menu.addItem(withTitle: "Select All",
                     action: #selector(NSText.selectAll(_:)),
                     keyEquivalent: "a")

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - Window menu

    private static func makeWindowMenuItem() -> NSMenuItem {
        let menu = NSMenu(title: "Window")

        menu.addItem(withTitle: "Minimize",
                     action: #selector(NSWindow.performMiniaturize(_:)),
                     keyEquivalent: "m")
        menu.addItem(withTitle: "Zoom",
                     action: #selector(NSWindow.performZoom(_:)),
                     keyEquivalent: "")
        menu.addItem(NSMenuItem.separator())
        menu.addItem(withTitle: "Bring All to Front",
                     action: #selector(NSApplication.arrangeInFront(_:)),
                     keyEquivalent: "")

        NSApp.windowsMenu = menu

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }
}
