// MenuBuilder.swift
// Builds the application menu bar for Chord Writer programmatically. The product
// name comes from AppIdentity (ADR-279 D1) rather than being spelled inline, so
// the app menu, About, Hide, and Quit items can never drift apart.
// Public interface: MenuBuilder.makeMainMenu(target:) returns the NSMenu to assign to NSApp.mainMenu.
// Owner context: tools/ide — App shell.

import AppKit

enum MenuBuilder {

    static func makeMainMenu(target: AnyObject) -> NSMenu {
        let mainMenu = NSMenu()
        mainMenu.addItem(makeAppMenuItem(target: target))
        mainMenu.addItem(makeFileMenuItem(target: target))
        mainMenu.addItem(makeEditMenuItem())
        mainMenu.addItem(makeViewMenuItem(target: target))
        mainMenu.addItem(makeBuildMenuItem(target: target))
        mainMenu.addItem(makeTestMenuItem(target: target))
        mainMenu.addItem(makeWindowMenuItem())
        return mainMenu
    }

    // MARK: - App menu

    private static func makeAppMenuItem(target: AnyObject) -> NSMenuItem {
        let name = AppIdentity.productName
        let menu = NSMenu(title: name)

        // Routed through AppDelegate rather than NSApplication's standard
        // selector so the panel can carry the toolchain versions alongside the
        // app's own (ADR-279 D1: "About and the status bar show both").
        let about = NSMenuItem(title: "About \(name)",
                               action: #selector(AppDelegate.showAboutPanel(_:)),
                               keyEquivalent: "")
        about.target = target
        menu.addItem(about)
        menu.addItem(NSMenuItem.separator())

        let services = NSMenuItem(title: "Services", action: nil, keyEquivalent: "")
        let servicesMenu = NSMenu(title: "Services")
        services.submenu = servicesMenu
        NSApp.servicesMenu = servicesMenu
        menu.addItem(services)
        menu.addItem(NSMenuItem.separator())

        menu.addItem(withTitle: "Hide \(name)",
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

        menu.addItem(withTitle: "Quit \(name)",
                     action: #selector(NSApplication.terminate(_:)),
                     keyEquivalent: "q")

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - File menu

    /// Identifier assigned to the Open Recent submenu so AppDelegate can recognize it
    /// in `menuNeedsUpdate(_:)` (and ignore unrelated menus, should any be added later).
    static let openRecentMenuIdentifier = NSUserInterfaceItemIdentifier("SharpeeOpenRecentMenu")

    private static func makeFileMenuItem(target: AnyObject) -> NSMenuItem {
        let menu = NSMenu(title: "File")

        let newStory = NSMenuItem(title: "New Story…",
                                  action: #selector(AppDelegate.newStory(_:)),
                                  keyEquivalent: "n")
        newStory.target = target
        menu.addItem(newStory)

        let open = NSMenuItem(title: "Open Project…",
                              action: #selector(AppDelegate.openProject(_:)),
                              keyEquivalent: "o")
        open.target = target
        menu.addItem(open)

        let recentItem = NSMenuItem(title: "Open Recent", action: nil, keyEquivalent: "")
        let recentSubmenu = NSMenu(title: "Open Recent")
        recentSubmenu.identifier = openRecentMenuIdentifier
        recentSubmenu.delegate = target as? NSMenuDelegate
        recentItem.submenu = recentSubmenu
        menu.addItem(recentItem)

        menu.addItem(NSMenuItem.separator())

        let save = NSMenuItem(title: "Save",
                              action: #selector(AppDelegate.saveDocument(_:)),
                              keyEquivalent: "s")
        save.target = target
        menu.addItem(save)
        menu.addItem(NSMenuItem.separator())

        menu.addItem(withTitle: "Close",
                     action: #selector(NSWindow.performClose(_:)),
                     keyEquivalent: "w")

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - View menu

    private static func makeViewMenuItem(target: AnyObject) -> NSMenuItem {
        let menu = NSMenu(title: "View")

        let wordWrap = NSMenuItem(title: "Word Wrap",
                                  action: #selector(AppDelegate.toggleWordWrap(_:)),
                                  keyEquivalent: "")
        wordWrap.target = target
        menu.addItem(wordWrap)

        menu.addItem(NSMenuItem.separator())

        // Font family + size for the story pane and the right-panel text
        // surfaces. Radio state applied in AppDelegate.validateMenuItem.
        let fontMenu = NSMenu(title: "Font")
        for family in FontFamily.allCases {
            let item = NSMenuItem(title: family.displayName,
                                  action: #selector(AppDelegate.selectFontFamily(_:)),
                                  keyEquivalent: "")
            item.target = target
            item.representedObject = family.rawValue
            fontMenu.addItem(item)
        }
        fontMenu.addItem(NSMenuItem.separator())
        for scale in FontScale.allCases {
            let item = NSMenuItem(title: scale.displayName,
                                  action: #selector(AppDelegate.selectFontScale(_:)),
                                  keyEquivalent: "")
            item.target = target
            item.representedObject = scale.rawValue
            fontMenu.addItem(item)
        }
        let font = NSMenuItem(title: "Font", action: nil, keyEquivalent: "")
        font.submenu = fontMenu
        menu.addItem(font)

        // Appearance override (GH #129 item 3): System / Light / Dark.
        // Radio state applied in AppDelegate.validateMenuItem.
        let appearanceMenu = NSMenu(title: "Appearance")
        for choice in AppearanceChoice.allCases {
            let item = NSMenuItem(title: choice.displayName,
                                  action: #selector(AppDelegate.selectAppearance(_:)),
                                  keyEquivalent: "")
            item.target = target
            item.representedObject = choice.rawValue
            appearanceMenu.addItem(item)
        }
        let appearance = NSMenuItem(title: "Appearance", action: nil, keyEquivalent: "")
        appearance.submenu = appearanceMenu
        menu.addItem(appearance)

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - Build menu

    private static func makeBuildMenuItem(target: AnyObject) -> NSMenuItem {
        let menu = NSMenu(title: "Build")

        let build = NSMenuItem(title: "Build",
                               action: #selector(AppDelegate.buildProject(_:)),
                               keyEquivalent: "b")
        build.target = target
        menu.addItem(build)

        menu.addItem(NSMenuItem.separator())

        let cancel = NSMenuItem(title: "Cancel Build",
                                action: #selector(AppDelegate.cancelBuild(_:)),
                                keyEquivalent: ".")
        cancel.target = target
        menu.addItem(cancel)

        let item = NSMenuItem()
        item.submenu = menu
        return item
    }

    // MARK: - Test menu (ADR-277 D2)

    private static func makeTestMenuItem(target: AnyObject) -> NSMenuItem {
        let menu = NSMenu(title: "Test")

        // ONE run item. "Run All Tests" ran the suite flat, which is wrong for a
        // `continues:` tree (229 passed / 287 failed on fernhill, against 516 / 0
        // as a tree); "Run Walkthrough Chain" scanned `walkthroughs/`, which an
        // IDE project does not have; "Run Current Test File" ran one transcript
        // standalone, which fails the same way whenever that file continues
        // another (2 passed / 29 failed on fernhill's `smoke`). Running a single
        // NODE with its ancestry is a real feature, but it is a tree operation
        // that does not exist yet — not a flat single-file run.
        let runTests = NSMenuItem(title: "Run Tests",
                                  action: #selector(AppDelegate.runTests(_:)),
                                  keyEquivalent: "u")
        runTests.target = target
        menu.addItem(runTests)

        // No Bless / Checkpoint items: ADR-299 D8 moved blessing into the
        // Transcript view, where the output being vouched for is readable, and
        // export lives beside it. A menu command acting on "the thread shown in
        // a tab you may not be looking at" would be worse than the button.

        menu.addItem(NSMenuItem.separator())

        let cancel = NSMenuItem(title: "Cancel Test Run",
                                action: #selector(AppDelegate.cancelTestRun(_:)),
                                keyEquivalent: "")
        cancel.target = target
        menu.addItem(cancel)

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
