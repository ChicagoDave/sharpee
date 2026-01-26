import { useEditorStore } from '../../store/editor-store';
import './RegionList.css';

export function RegionList() {
  const regions = useEditorStore(state => state.regions);
  const selectedRegion = useEditorStore(state => state.selectedRegion);
  const selectRegion = useEditorStore(state => state.selectRegion);
  const deleteRegion = useEditorStore(state => state.deleteRegion);

  if (regions.length === 0) {
    return (
      <div className="region-list-empty">
        No regions yet. Create one below.
      </div>
    );
  }

  return (
    <div className="region-list">
      {regions.map(region => {
        const isSelected = region.id === selectedRegion;

        return (
          <div
            key={region.id}
            className={`region-item ${isSelected ? 'selected' : ''}`}
            onClick={() => selectRegion(isSelected ? null : region.id)}
          >
            <div
              className="region-color"
              style={{ backgroundColor: region.color }}
            />
            <div className="region-info">
              <span className="region-name">{region.name}</span>
              <span className="region-count">{region.rooms.length} rooms</span>
            </div>
            <button
              className="region-delete"
              onClick={e => {
                e.stopPropagation();
                deleteRegion(region.id);
              }}
              title="Delete region"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
