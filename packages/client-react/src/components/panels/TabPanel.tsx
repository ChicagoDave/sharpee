/**
 * TabPanel - Container for tabbed side panel content
 */

import React, { useState, type ReactNode } from 'react';

export interface TabConfig {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
}

interface TabPanelProps {
  tabs: TabConfig[];
  defaultTab?: string;
  className?: string;
}

export function TabPanel({ tabs, defaultTab, className = '' }: TabPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const activeTabConfig = tabs.find((t) => t.id === activeTab);

  return (
    <div className={`tab-panel ${className}`}>
      <div className="tab-panel__header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-panel__tab ${activeTab === tab.id ? 'tab-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.icon && <span className="tab-panel__icon">{tab.icon}</span>}
            <span className="tab-panel__label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-panel__content">
        {activeTabConfig?.content}
      </div>
    </div>
  );
}

/**
 * CSS styles for TabPanel
 */
export const tabPanelStyles = `
.tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-panel__header {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid currentColor;
}

.tab-panel__tab {
  flex: 1;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.tab-panel__tab:hover {
  opacity: 1;
}

.tab-panel__tab--active {
  opacity: 1;
  border-bottom: 2px solid currentColor;
}

.tab-panel__icon {
  margin-right: 0.25rem;
}

.tab-panel__content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
`;
