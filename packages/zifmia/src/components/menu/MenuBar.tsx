/**
 * MenuBar - Top menu bar with File, Settings, Help menus
 */

import React, { useState, useRef, useEffect } from 'react';
import { usePreferences, ILLUSTRATION_SIZES, FONT_FAMILIES, FONT_SIZES } from '../../hooks/usePreferences';
import type { StoryMetadata } from '../../types/story-metadata';

export interface MenuBarProps {
  onSave?: () => void;
  onRestore?: () => void;
  onQuit?: () => void;
  onExportTranscript?: () => void;
  onExportWalkthrough?: () => void;
  onThemeChange?: (theme: string) => void;
  currentTheme?: string;
  storyTitle?: string;
  storyMetadata?: StoryMetadata;
  zifmiaVersion?: string;
  engineVersion?: string;
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
  onExportTranscript,
  onExportWalkthrough,
  onThemeChange,
  currentTheme = 'classic-light',
  storyTitle = 'Sharpee',
  storyMetadata,
  zifmiaVersion,
  engineVersion,
}: MenuBarProps) {
  const { preferences, setPreference } = usePreferences();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
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
        setShowShortcuts(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fileMenu: MenuItem[] = [
    { label: 'Save Game...', action: onSave, disabled: !onSave },
    { label: 'Restore Game...', action: onRestore, disabled: !onRestore },
    { separator: true, label: '' },
    { label: 'Save Transcript...', action: onExportTranscript, disabled: !onExportTranscript },
    { label: 'Export Walkthrough...', action: onExportWalkthrough, disabled: !onExportWalkthrough },
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
    {
      label: 'Font',
      submenu: [
        ...FONT_FAMILIES.map(f => ({
          label: f.label,
          action: () => setPreference('fontFamily', f.id),
          checked: preferences.fontFamily === f.id,
        })),
        { separator: true, label: '' },
        ...FONT_SIZES.map(s => ({
          label: s.label,
          action: () => setPreference('fontSize', s.id),
          checked: preferences.fontSize === s.id,
        })),
      ],
    },
    {
      label: 'Illustrations',
      submenu: [
        {
          label: 'Show Illustrations',
          action: () => setPreference('illustrationsEnabled', !preferences.illustrationsEnabled),
          checked: preferences.illustrationsEnabled,
        },
        { separator: true, label: '' },
        ...ILLUSTRATION_SIZES.map(size => ({
          label: size.label,
          action: () => setPreference('illustrationSize', size.id),
          checked: preferences.illustrationSize === size.id,
        })),
      ],
    },
  ];

  const helpMenu: MenuItem[] = [
    { label: 'Keyboard Shortcuts', action: () => setShowShortcuts(true) },
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

      {/* Keyboard Shortcuts Dialog */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Keyboard Shortcuts</h2>
              <button className="modal-close" onClick={() => setShowShortcuts(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <table className="shortcuts-table">
                <tbody>
                  <tr><td className="shortcut-key">Enter</td><td>Execute command</td></tr>
                  <tr><td className="shortcut-key">Up / Down</td><td>Command history</td></tr>
                  <tr><td className="shortcut-key">Escape</td><td>Close menus and dialogs</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* About Dialog */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>About</h2>
              <button className="modal-close" onClick={() => setShowAbout(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>{storyTitle}</strong>{storyMetadata?.version ? ` v${storyMetadata.version}` : ''}</p>
              {storyMetadata?.author && (
                <p style={{ fontSize: '13px', color: 'var(--sharpee-text-muted)' }}>
                  by {Array.isArray(storyMetadata.author) ? storyMetadata.author.join(', ') : storyMetadata.author}
                </p>
              )}
              <p style={{ marginTop: '16px', borderTop: '1px solid var(--sharpee-border)', paddingTop: '12px', fontSize: '13px' }}>
                Powered by <strong>Sharpee</strong> &mdash; a parser-based interactive fiction engine.
              </p>
              <table className="shortcuts-table" style={{ marginTop: '8px' }}>
                <tbody>
                  {engineVersion && <tr><td style={{ color: 'var(--sharpee-text-muted)', fontSize: '12px' }}>Sharpee Engine</td><td style={{ fontSize: '12px' }}>{engineVersion}</td></tr>}
                  {zifmiaVersion && <tr><td style={{ color: 'var(--sharpee-text-muted)', fontSize: '12px' }}>Zifmia Runner</td><td style={{ fontSize: '12px' }}>{zifmiaVersion}</td></tr>}
                  {storyMetadata?.version && <tr><td style={{ color: 'var(--sharpee-text-muted)', fontSize: '12px' }}>Story</td><td style={{ fontSize: '12px' }}>{storyMetadata.version}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
