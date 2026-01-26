import { useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { RegionList } from './RegionList';
import { RoomList } from './RoomList';
import './Sidebar.css';

export function Sidebar() {
  const [newRegionName, setNewRegionName] = useState('');
  const createRegion = useEditorStore(state => state.createRegion);

  function handleCreateRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!newRegionName.trim()) return;

    createRegion(newRegionName.trim());
    setNewRegionName('');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h2 className="sidebar-heading">Regions</h2>
        <RegionList />

        <form className="new-region-form" onSubmit={handleCreateRegion}>
          <input
            type="text"
            placeholder="New region name..."
            value={newRegionName}
            onChange={e => setNewRegionName(e.target.value)}
          />
          <button type="submit" disabled={!newRegionName.trim()}>+</button>
        </form>
      </div>

      <div className="sidebar-section sidebar-section-grow">
        <h2 className="sidebar-heading">Unassigned Rooms</h2>
        <RoomList />
      </div>
    </aside>
  );
}
