import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface RoomNodeData {
  label: string;
  roomId: string;
  description?: string;
  color: string;
  selected?: boolean;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

export const RoomNode = memo(function RoomNode({ data }: NodeProps) {
  const { label, roomId, description, color, selected } = data as RoomNodeData;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="room-node"
      style={{
        background: selected ? 'var(--blue)' : color,
        border: `2px solid ${selected ? 'var(--text)' : 'var(--crust)'}`,
        borderRadius: '4px',
        padding: '8px 12px',
        minWidth: '70px',
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--crust)',
        cursor: 'grab',
        boxShadow: selected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
        position: 'relative',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Connection handles for edges */}
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top-target" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />

      <span style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {label.length > 12 ? label.slice(0, 11) + '\u2026' : label}
      </span>

      {/* Tooltip with room details */}
      {showTooltip && (
        <div
          className="room-tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: 'var(--mantle)',
            border: '1px solid var(--surface1)',
            borderRadius: '6px',
            padding: '8px 12px',
            minWidth: '200px',
            maxWidth: '350px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            pointerEvents: 'none',
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--subtext0)', marginBottom: '6px', fontFamily: 'monospace' }}>
            ID: {roomId}
          </div>
          {description && (
            <div style={{ fontSize: '11px', color: 'var(--subtext1)', lineHeight: 1.4 }}>
              {description.length > 200 ? description.slice(0, 197) + '...' : description}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export const nodeTypes = {
  room: RoomNode,
};
