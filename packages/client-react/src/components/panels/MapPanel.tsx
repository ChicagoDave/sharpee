/**
 * MapPanel - Auto-generated exploration map
 *
 * SVG-based visualization of visited rooms:
 * - Rooms shown as boxes with names
 * - Connections shown as lines
 * - Current room highlighted
 * - Pan and zoom controls
 * - Level selector for multi-floor areas
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useMap, type MapRoom, type MapConnection } from '../../hooks/useMap';

interface MapPanelProps {
  storyId: string;
  className?: string;
}

// Layout constants
const ROOM_WIDTH = 100;
const ROOM_HEIGHT = 40;
const GRID_SPACING_X = 140;
const GRID_SPACING_Y = 70;
const PADDING = 20;

/**
 * Calculate SVG coordinates from grid position
 */
function gridToSvg(
  x: number,
  y: number,
  bounds: { minX: number; minY: number }
): { svgX: number; svgY: number } {
  const svgX = (x - bounds.minX) * GRID_SPACING_X + PADDING + ROOM_WIDTH / 2;
  const svgY = (y - bounds.minY) * GRID_SPACING_Y + PADDING + ROOM_HEIGHT / 2;
  return { svgX, svgY };
}

/**
 * Render a single room box
 */
function RoomBox({
  room,
  bounds,
  isCurrent,
}: {
  room: MapRoom;
  bounds: { minX: number; minY: number };
  isCurrent: boolean;
}) {
  const { svgX, svgY } = gridToSvg(room.x, room.y, bounds);
  const x = svgX - ROOM_WIDTH / 2;
  const y = svgY - ROOM_HEIGHT / 2;

  // Truncate long names
  const displayName =
    room.name.length > 14 ? room.name.substring(0, 12) + '...' : room.name;

  return (
    <g className={`map-room ${isCurrent ? 'map-room--current' : ''}`}>
      <rect
        x={x}
        y={y}
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
        rx={4}
        className="map-room__box"
      />
      <text x={svgX} y={svgY} className="map-room__name" textAnchor="middle" dy="0.35em">
        {displayName}
      </text>
      {/* Show level indicator for non-ground floors */}
      {room.z !== 0 && (
        <text
          x={x + ROOM_WIDTH - 4}
          y={y + 10}
          className="map-room__level"
          textAnchor="end"
          fontSize="10"
        >
          {room.z > 0 ? `↑${room.z}` : `↓${Math.abs(room.z)}`}
        </text>
      )}
    </g>
  );
}

/**
 * Render a connection line between rooms
 */
function ConnectionLine({
  connection,
  rooms,
  bounds,
}: {
  connection: MapConnection;
  rooms: Map<string, MapRoom>;
  bounds: { minX: number; minY: number };
}) {
  const fromRoom = rooms.get(connection.fromId);
  const toRoom = rooms.get(connection.toId);

  if (!fromRoom || !toRoom) return null;

  // Don't render connections between different z-levels (shown with level indicator instead)
  if (fromRoom.z !== toRoom.z) return null;

  const from = gridToSvg(fromRoom.x, fromRoom.y, bounds);
  const to = gridToSvg(toRoom.x, toRoom.y, bounds);

  return (
    <line
      x1={from.svgX}
      y1={from.svgY}
      x2={to.svgX}
      y2={to.svgY}
      className="map-connection"
    />
  );
}

/**
 * Render exit stubs for unexplored exits
 */
function ExitStubs({
  room,
  bounds,
  connections,
}: {
  room: MapRoom;
  bounds: { minX: number; minY: number };
  connections: MapConnection[];
}) {
  const { svgX, svgY } = gridToSvg(room.x, room.y, bounds);

  // Find exits that don't have connections yet
  const connectedDirections = new Set(
    connections
      .filter((c) => c.fromId === room.id || c.toId === room.id)
      .map((c) => c.direction)
  );

  const STUB_LENGTH = 15;
  const DIRECTION_ANGLES: Record<string, number> = {
    north: -90,
    south: 90,
    east: 0,
    west: 180,
    northeast: -45,
    northwest: -135,
    southeast: 45,
    southwest: 135,
    n: -90,
    s: 90,
    e: 0,
    w: 180,
    ne: -45,
    nw: -135,
    se: 45,
    sw: 135,
  };

  return (
    <>
      {room.exits
        .filter((exit) => {
          const dir = exit.direction.toLowerCase();
          // Skip up/down exits (shown with level indicator)
          if (dir === 'up' || dir === 'down' || dir === 'u' || dir === 'd') {
            return false;
          }
          // Skip if already connected
          return !connectedDirections.has(dir);
        })
        .map((exit) => {
          const dir = exit.direction.toLowerCase();
          const angle = DIRECTION_ANGLES[dir];
          if (angle === undefined) return null;

          const rad = (angle * Math.PI) / 180;
          const startX = svgX + (ROOM_WIDTH / 2) * Math.cos(rad);
          const startY = svgY + (ROOM_HEIGHT / 2) * Math.sin(rad);
          const endX = startX + STUB_LENGTH * Math.cos(rad);
          const endY = startY + STUB_LENGTH * Math.sin(rad);

          return (
            <g key={`${room.id}-${dir}`} className="map-exit-stub">
              <line x1={startX} y1={startY} x2={endX} y2={endY} />
              <circle cx={endX} cy={endY} r={3} />
            </g>
          );
        })}
    </>
  );
}

export function MapPanel({ storyId, className = '' }: MapPanelProps) {
  const { rooms, connections, currentRoomId, currentLevel, bounds, clearMap } =
    useMap(storyId);
  const [viewLevel, setViewLevel] = useState(currentLevel);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Update view level when player moves to new level
  useEffect(() => {
    setViewLevel(currentLevel);
  }, [currentLevel]);

  // Calculate SVG viewBox dimensions
  const { viewBox, width, height } = useMemo(() => {
    const w = (bounds.maxX - bounds.minX + 1) * GRID_SPACING_X + PADDING * 2;
    const h = (bounds.maxY - bounds.minY + 1) * GRID_SPACING_Y + PADDING * 2;
    return {
      viewBox: `${-pan.x / zoom} ${-pan.y / zoom} ${w / zoom} ${h / zoom}`,
      width: Math.max(w, 200),
      height: Math.max(h, 150),
    };
  }, [bounds, zoom, pan]);

  // Filter rooms by current view level
  const visibleRooms = useMemo(() => {
    return Array.from(rooms.values()).filter((r) => r.z === viewLevel);
  }, [rooms, viewLevel]);

  // Get unique levels
  const levels = useMemo(() => {
    const lvls = new Set<number>();
    for (const room of rooms.values()) {
      lvls.add(room.z);
    }
    return Array.from(lvls).sort((a, b) => b - a); // Highest first
  }, [rooms]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.5, Math.min(3, z * delta)));
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (rooms.size === 0) {
    return (
      <div className={`map-panel map-panel--empty ${className}`}>
        <p className="map-panel__empty-message">
          No rooms explored yet. Move around to build your map!
        </p>
      </div>
    );
  }

  return (
    <div className={`map-panel ${className}`}>
      {/* Controls */}
      <div className="map-panel__controls">
        {levels.length > 1 && (
          <div className="map-panel__level-select">
            <label htmlFor="map-level">Level:</label>
            <select
              id="map-level"
              value={viewLevel}
              onChange={(e) => setViewLevel(Number(e.target.value))}
            >
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 0 ? 'Ground' : lvl > 0 ? `Up ${lvl}` : `Down ${Math.abs(lvl)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="map-panel__zoom-controls">
          <button type="button" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
            +
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}>
            −
          </button>
          <button type="button" onClick={resetView}>
            ⟲
          </button>
        </div>
        <button type="button" className="map-panel__clear" onClick={clearMap}>
          Clear
        </button>
      </div>

      {/* Map SVG */}
      <svg
        ref={svgRef}
        className="map-panel__svg"
        viewBox={`0 0 ${width} ${height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Connections first (behind rooms) */}
          {connections.map((conn, i) => (
            <ConnectionLine
              key={`${conn.fromId}-${conn.toId}-${i}`}
              connection={conn}
              rooms={rooms}
              bounds={bounds}
            />
          ))}

          {/* Exit stubs */}
          {visibleRooms.map((room) => (
            <ExitStubs
              key={`stubs-${room.id}`}
              room={room}
              bounds={bounds}
              connections={connections}
            />
          ))}

          {/* Room boxes */}
          {visibleRooms.map((room) => (
            <RoomBox
              key={room.id}
              room={room}
              bounds={bounds}
              isCurrent={room.id === currentRoomId}
            />
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div className="map-panel__legend">
        <span className="map-panel__legend-item map-panel__legend-item--current">
          ● Current
        </span>
        <span className="map-panel__legend-item map-panel__legend-item--visited">
          ○ Visited
        </span>
        <span className="map-panel__legend-item map-panel__legend-item--unexplored">
          ◦ Unexplored
        </span>
      </div>
    </div>
  );
}

