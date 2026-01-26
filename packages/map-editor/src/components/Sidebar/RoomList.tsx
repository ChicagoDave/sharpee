import { useState, useMemo } from 'react';
import { useEditorStore } from '../../store/editor-store';
import './RoomList.css';

export function RoomList() {
  const unassignedRooms = useEditorStore(state => state.unassignedRooms);
  const rooms = useEditorStore(state => state.rooms);
  const selectedRegion = useEditorStore(state => state.selectedRegion);
  const assignRoomToRegion = useEditorStore(state => state.assignRoomToRegion);

  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) {
      return unassignedRooms;
    }
    const query = searchQuery.toLowerCase();
    return unassignedRooms.filter(roomId => {
      const room = rooms.get(roomId);
      if (!room) return false;
      // Search in name, id, and description
      return room.name.toLowerCase().includes(query) ||
             room.id.toLowerCase().includes(query) ||
             (room.description?.toLowerCase().includes(query) ?? false);
    });
  }, [unassignedRooms, rooms, searchQuery]);

  // Show limited rooms unless expanded or searching
  const displayedRooms = (isExpanded || searchQuery)
    ? filteredRooms
    : filteredRooms.slice(0, 10);

  const hasMore = !isExpanded && !searchQuery && filteredRooms.length > 10;

  if (unassignedRooms.length === 0) {
    return (
      <div className="room-list-empty">
        All rooms assigned to regions.
      </div>
    );
  }

  function handleDragStart(e: React.DragEvent, roomId: string) {
    e.dataTransfer.setData('text/plain', roomId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDoubleClick(roomId: string) {
    if (selectedRegion) {
      assignRoomToRegion(roomId, selectedRegion);
    }
  }

  const hoveredRoomData = hoveredRoom ? rooms.get(hoveredRoom) : null;

  return (
    <div className="room-list">
      <div className="room-list-header">
        <span className="room-list-count">{unassignedRooms.length} unassigned</span>
        {unassignedRooms.length > 10 && (
          <input
            type="text"
            className="room-search"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        )}
      </div>

      {!selectedRegion && unassignedRooms.length > 0 && (
        <div className="room-list-hint">
          Select a region first, then double-click rooms to assign
        </div>
      )}

      <div className="room-list-items">
        {displayedRooms.map(roomId => {
          const room = rooms.get(roomId);
          if (!room) return null;

          return (
            <div
              key={roomId}
              className={`room-card ${selectedRegion ? 'assignable' : ''}`}
              draggable={!!selectedRegion}
              onDragStart={e => handleDragStart(e, roomId)}
              onDoubleClick={() => handleDoubleClick(roomId)}
              onMouseEnter={() => setHoveredRoom(roomId)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              <span className="room-name">{room.name}</span>
              <span className="room-exits">{room.exits.length}</span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          className="room-list-expand"
          onClick={() => setIsExpanded(true)}
        >
          Show all {unassignedRooms.length} rooms
        </button>
      )}

      {isExpanded && unassignedRooms.length > 10 && (
        <button
          className="room-list-expand"
          onClick={() => setIsExpanded(false)}
        >
          Show less
        </button>
      )}

      {/* Room details tooltip */}
      {hoveredRoomData && (
        <div className="room-tooltip-sidebar">
          <div className="room-tooltip-name">{hoveredRoomData.name}</div>
          <div className="room-tooltip-id">ID: {hoveredRoomData.id}</div>
          {hoveredRoomData.description && (
            <div className="room-tooltip-desc">
              {hoveredRoomData.description.length > 150
                ? hoveredRoomData.description.slice(0, 147) + '...'
                : hoveredRoomData.description}
            </div>
          )}
          <div className="room-tooltip-exits">
            Exits: {hoveredRoomData.exits.map(e => e.direction).join(', ') || 'none'}
          </div>
        </div>
      )}
    </div>
  );
}
