import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../../store/editor-store';
import { nodeTypes, type RoomNodeData } from './RoomNode';
import './Canvas.css';

const GRID_SIZE = 80; // Pixels per grid unit

export function Canvas() {
  const selectedRegion = useEditorStore(state => state.selectedRegion);
  const regions = useEditorStore(state => state.regions);
  const rooms = useEditorStore(state => state.rooms);
  const selectedRooms = useEditorStore(state => state.selectedRooms);
  const assignRoomToRegion = useEditorStore(state => state.assignRoomToRegion);
  const moveRoom = useEditorStore(state => state.moveRoom);
  const selectRoom = useEditorStore(state => state.selectRoom);
  const viewState = useEditorStore(state => state.viewState);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const region = regions.find(r => r.id === selectedRegion);

  // Convert our store data to React Flow nodes
  const storeNodes = useMemo((): Node[] => {
    if (!region) return [];

    const result: Node[] = [];
    for (const regionRoom of region.rooms) {
      const room = rooms.get(regionRoom.roomId);
      if (!room) continue;

      result.push({
        id: regionRoom.roomId,
        type: 'room',
        position: {
          x: regionRoom.x * GRID_SIZE,
          y: regionRoom.y * GRID_SIZE,
        },
        data: {
          label: room.name,
          roomId: room.id,
          description: room.description,
          color: region.color,
          selected: selectedRooms.includes(regionRoom.roomId),
        } as RoomNodeData,
      });
    }
    return result;
  }, [region, rooms, selectedRooms]);

  // Map exit directions to handle positions
  const directionToHandle = (dir: string): string => {
    const d = dir.toLowerCase();
    if (d === 'north' || d === 'n') return 'top';
    if (d === 'south' || d === 's') return 'bottom';
    if (d === 'east' || d === 'e') return 'right';
    if (d === 'west' || d === 'w') return 'left';
    if (d === 'up' || d === 'u') return 'top';
    if (d === 'down' || d === 'd') return 'bottom';
    if (d === 'northeast' || d === 'ne') return 'right';
    if (d === 'northwest' || d === 'nw') return 'left';
    if (d === 'southeast' || d === 'se') return 'right';
    if (d === 'southwest' || d === 'sw') return 'left';
    return 'bottom'; // default
  };

  // Get opposite handle for target
  const oppositeHandle = (handle: string): string => {
    if (handle === 'top') return 'bottom';
    if (handle === 'bottom') return 'top';
    if (handle === 'left') return 'right';
    if (handle === 'right') return 'left';
    return 'top';
  };

  // Convert exits to React Flow edges
  const storeEdges = useMemo((): Edge[] => {
    if (!region || !viewState.showConnections) return [];

    const edges: Edge[] = [];
    const addedEdges = new Set<string>();

    for (const regionRoom of region.rooms) {
      const room = rooms.get(regionRoom.roomId);
      if (!room) continue;

      for (const exit of room.exits) {
        // Only show edges to rooms in this region
        const destInRegion = region.rooms.find(r => r.roomId === exit.destinationId);
        if (!destInRegion) continue;

        // Avoid duplicate edges (A->B and B->A)
        const edgeKey = [regionRoom.roomId, exit.destinationId].sort().join('-');
        if (addedEdges.has(edgeKey)) continue;
        addedEdges.add(edgeKey);

        // Determine handles based on exit direction
        const sourceHandle = directionToHandle(exit.direction);
        const targetHandle = oppositeHandle(sourceHandle) + '-target';

        edges.push({
          id: edgeKey,
          source: regionRoom.roomId,
          target: exit.destinationId,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
          style: { stroke: 'var(--overlay0)', strokeWidth: 2 },
        });
      }
    }

    return edges;
  }, [region, rooms, viewState.showConnections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges] = useEdgesState(storeEdges);

  // Sync React Flow state with store
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // Handle drag end - snap to grid and update store
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // Snap to half-grid (0.5 increments)
    const gridX = Math.round((node.position.x / GRID_SIZE) * 2) / 2;
    const gridY = Math.round((node.position.y / GRID_SIZE) * 2) / 2;

    moveRoom(node.id, gridX, gridY);
  }, [moveRoom]);

  // Handle node click for selection
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    selectRoom(node.id);
  }, [selectRoom]);

  // Handle drop from sidebar
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const roomId = event.dataTransfer.getData('text/plain');
    if (!roomId || !selectedRegion || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    // Convert to grid coordinates with half-grid snapping
    const gridX = Math.round((x / GRID_SIZE) * 2) / 2;
    const gridY = Math.round((y / GRID_SIZE) * 2) / 2;

    assignRoomToRegion(roomId, selectedRegion, gridX, gridY);
  }, [selectedRegion, assignRoomToRegion]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  if (!selectedRegion || !region) {
    return (
      <div className="canvas-placeholder">
        <p>Select a region to view and edit its layout</p>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="canvas-header">
        <span className="canvas-region-color" style={{ backgroundColor: region.color }} />
        <span className="canvas-region-name">{region.name}</span>
        <span className="canvas-room-count">{region.rooms.length} rooms</span>
      </div>

      <div
        className="canvas-area"
        ref={reactFlowWrapper}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {region.rooms.length === 0 ? (
          <div className="canvas-empty">
            <p>Drag rooms here from the sidebar</p>
            <p className="canvas-empty-hint">or double-click rooms to add them</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[GRID_SIZE / 2, GRID_SIZE / 2]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.25}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'default',
              style: { stroke: 'var(--overlay0)', strokeWidth: 2 },
            }}
          >
            {viewState.showGrid && (
              <Background
                variant={BackgroundVariant.Lines}
                gap={GRID_SIZE}
                color="var(--surface1)"
              />
            )}
            <Controls />
            <MiniMap
              nodeColor={(node) => (node.data as RoomNodeData).color}
              maskColor="rgba(0, 0, 0, 0.2)"
              style={{ background: 'var(--mantle)' }}
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
