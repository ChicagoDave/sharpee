/**
 * MenuBar - Top menu bar with File, Settings, Help menus
 */

import React, { useState, useRef, useEffect } from 'react';

export interface MenuBarProps {
  onSave?: () => void;
  onRestore?: () => void;
  onQuit?: () => void;
  onThemeChange?: (theme: string) => void;
  currentTheme?: string;
  storyTitle?: string;
}

interface MenuItem {
  label: string;
  action?: () => void;
  submenu?: MenuItem[];
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

const THEMES = [
  { id: 'classic-light', label: 'Classic Light' },
  { id: 'modern-dark', label: 'Modern Dark' },
  { id: 'retro-terminal', label: 'Retro Terminal' },
  { id: 'paper', label: 'Paper' },
];

export function MenuBar({
  onSave,
  onRestore,
  onQuit,
  onThemeChange,
  currentTheme = 'classic-light',
  storyTitle = 'Sharpee',
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setShowAbout(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fileMenu: MenuItem[] = [
    { label: 'Save Game...', action: onSave, disabled: !onSave },
    { label: 'Restore Game...', action: onRestore, disabled: !onRestore },
    { separator: true, label: '' },
    { label: 'Quit', action: onQuit, disabled: !onQuit },
  ];

  const settingsMenu: MenuItem[] = [
    {
      label: 'Theme',
      submenu: THEMES.map(theme => ({
        label: theme.label,
        action: () => onThemeChange?.(theme.id),
        checked: currentTheme === theme.id,
      })),
    },
  ];

  const helpMenu: MenuItem[] = [
    { label: 'Keyboard Shortcuts', action: () => alert('Arrow Up/Down: Command history\nEnter: Execute command') },
    { separator: true, label: '' },
    { label: 'About...', action: () => setShowAbout(true) },
  ];

  function handleMenuClick(menuName: string) {
    setOpenMenu(openMenu === menuName ? null : menuName);
  }

  function handleItemClick(item: MenuItem) {
    if (item.action && !item.disabled) {
      item.action();
      setOpenMenu(null);
    }
  }

  function renderMenu(items: MenuItem[], isSubmenu = false) {
    return (
      <div className={`menu-dropdown ${isSubmenu ? 'menu-dropdown--submenu' : ''}`}>
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className="menu-separator" />;
          }

          if (item.submenu) {
            return (
              <div key={index} className="menu-item menu-item--has-submenu">
                <span className="menu-item__label">{item.label}</span>
                <span className="menu-item__arrow">&#9656;</span>
                {renderMenu(item.submenu, true)}
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`menu-item ${item.disabled ? 'menu-item--disabled' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {item.checked && <span className="menu-item__check">&#10003;</span>}
              <span className="menu-item__label">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="menu-bar" ref={menuBarRef}>
        <div className="menu-bar__title">{storyTitle}</div>

        <div className="menu-bar__menus">
          <div className="menu-bar__menu">
            <button
              className={`menu-bar__button ${openMenu === 'file' ? 'menu-bar__button--active' : ''}`}
              onClick={() => handleMenuClick('file')}
            >
              File
            </button>
            {openMenu === 'file' && renderMenu(fileMenu)}
          </div>

          <div className="menu-bar__menu">
            <button
              className={`menu-bar__button ${openMenu === 'settings' ? 'menu-bar__button--active' : ''}`}
              onClick={() => handleMenuClick('settings')}
            >
              Settings
            </button>
            {openMenu === 'settings' && renderMenu(settingsMenu)}
          </div>

          <div className="menu-bar__menu">
            <button
              className={`menu-bar__button ${openMenu === 'help' ? 'menu-bar__button--active' : ''}`}
              onClick={() => handleMenuClick('help')}
            >
              Help
            </button>
            {openMenu === 'help' && renderMenu(helpMenu)}
          </div>
        </div>
      </div>

      {/* About Dialog */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>About {storyTitle}</h2>
              <button className="modal-close" onClick={() => setShowAbout(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>Sharpee Interactive Fiction Engine</strong></p>
              <p>A modern parser-based IF authoring system.</p>
              <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--sharpee-text-muted)' }}>
                Built with React and TypeScript.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
