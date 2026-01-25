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
      {/* Render all tabs but hide inactive ones to preserve state */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="tab-panel__content"
          style={{ display: activeTab === tab.id ? 'flex' : 'none' }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

