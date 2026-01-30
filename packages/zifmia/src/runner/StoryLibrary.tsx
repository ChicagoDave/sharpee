/**
 * StoryLibrary — home screen for selecting a story to play
 *
 * Supports file picker, URL input, drag-and-drop, and recent stories list.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserStorageProvider } from '../storage/index.js';

export interface RecentStory {
  title: string;
  author?: string;
  storyId: string;
  lastPlayed: number;
  source: 'file' | 'url';
  url?: string;
}

export interface StoryLibraryProps {
  onSelectUrl: (url: string) => void;
  onSelectFile: (data: ArrayBuffer, filename: string) => void;
  /** When running in Tauri, opens native file picker instead of browser <input> */
  onTauriOpen?: () => void;
}

const RECENTS_KEY = 'zifmia-recent-stories';

function loadRecents(): RecentStory[] {
  try {
    const json = localStorage.getItem(RECENTS_KEY);
    return json ? (JSON.parse(json) as RecentStory[]) : [];
  } catch {
    return [];
  }
}

function saveRecents(recents: RecentStory[]): void {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

export function addRecentStory(story: Omit<RecentStory, 'lastPlayed'>): void {
  const recents = loadRecents();
  const existing = recents.findIndex((r) => r.storyId === story.storyId);
  const entry: RecentStory = { ...story, lastPlayed: Date.now() };
  if (existing >= 0) {
    recents[existing] = entry;
  } else {
    recents.unshift(entry);
  }
  // Keep at most 20 recent stories
  saveRecents(recents.slice(0, 20));
}

export function StoryLibrary({ onSelectUrl, onSelectFile, onTauriOpen }: StoryLibraryProps) {
  const [recents, setRecents] = useState<RecentStory[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageProvider = useRef(new BrowserStorageProvider()).current;
  const [autoSaveStatus, setAutoSaveStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loaded = loadRecents();
    setRecents(loaded);

    // Check auto-save status for each recent story
    Promise.all(
      loaded.map(async (r) => [r.storyId, await storageProvider.hasAutoSave(r.storyId)] as const)
    ).then((results) => {
      const status: Record<string, boolean> = {};
      for (const [id, has] of results) status[id] = has;
      setAutoSaveStatus(status);
    });
  }, [storageProvider]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.sharpee')) {
      alert('Please select a .sharpee file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        onSelectFile(reader.result, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onSelectFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (trimmed) onSelectUrl(trimmed);
  }, [urlInput, onSelectUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleRemoveRecent = useCallback((storyId: string) => {
    const updated = recents.filter((r) => r.storyId !== storyId);
    setRecents(updated);
    saveRecents(updated);
  }, [recents]);

  return (
    <div
      className="zifmia-library"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <header className="zifmia-library__header">
        <h1>Zifmia Story Runner</h1>
        <p>Open a <code>.sharpee</code> story bundle to play.</p>
      </header>

      <div className="zifmia-library__actions">
        <button
          className="zifmia-library__open-btn"
          onClick={onTauriOpen ?? (() => fileInputRef.current?.click())}
        >
          Open Story File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sharpee"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        <form className="zifmia-library__url-form" onSubmit={handleUrlSubmit}>
          <input
            type="text"
            placeholder="Or paste a bundle URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button type="submit" disabled={!urlInput.trim()}>Load</button>
        </form>
      </div>

      {dragOver && (
        <div className="zifmia-library__dropzone">
          Drop <code>.sharpee</code> file here
        </div>
      )}

      {recents.length > 0 && (
        <div className="zifmia-library__recents">
          <h2>Recent Stories</h2>
          <ul>
            {recents.sort((a, b) => b.lastPlayed - a.lastPlayed).map((story) => (
              <li key={story.storyId} className="zifmia-library__recent-item">
                <div className="zifmia-library__recent-info">
                  <strong>{story.title}</strong>
                  {story.author && <span className="zifmia-library__author"> by {story.author}</span>}
                  <span className="zifmia-library__date">
                    {new Date(story.lastPlayed).toLocaleDateString()}
                  </span>
                </div>
                <div className="zifmia-library__recent-actions">
                  {story.source === 'url' && story.url && (
                    <button onClick={() => onSelectUrl(story.url!)}>
                      {autoSaveStatus[story.storyId] ? 'Continue' : 'Play'}
                    </button>
                  )}
                  {story.source === 'file' && (
                    <button onClick={() => fileInputRef.current?.click()}>
                      Re-open File
                    </button>
                  )}
                  <button
                    className="zifmia-library__remove"
                    onClick={() => handleRemoveRecent(story.storyId)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
