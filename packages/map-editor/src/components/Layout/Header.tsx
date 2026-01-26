import { useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import './Header.css';

export function Header() {
  const projectPath = useEditorStore(state => state.projectPath);
  const availableStories = useEditorStore(state => state.availableStories);
  const currentStory = useEditorStore(state => state.currentStory);
  const isDirty = useEditorStore(state => state.isDirty);
  const isLoading = useEditorStore(state => state.isLoading);
  const setStory = useEditorStore(state => state.setStory);
  const setRooms = useEditorStore(state => state.setRooms);
  const loadLayout = useEditorStore(state => state.loadLayout);
  const setLoading = useEditorStore(state => state.setLoading);
  const setError = useEditorStore(state => state.setError);
  const regions = useEditorStore(state => state.regions);
  const unassignedRooms = useEditorStore(state => state.unassignedRooms);
  const markClean = useEditorStore(state => state.markClean);
  const rooms = useEditorStore(state => state.rooms);
  const [loadingStatus, setLoadingStatus] = useState('');

  async function handleStoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const storyId = e.target.value;
    console.log('[Header] Story selected:', storyId, 'projectPath:', projectPath);
    if (!storyId || !projectPath) return;

    setLoading(true);
    setLoadingStatus('Initializing story...');
    setError(null);
    setStory(storyId);

    try {
      // Load story rooms
      setLoadingStatus('Loading world model...');
      console.log('[Header] Calling loadStory...');
      const storyResult = await window.mapEditorApi.loadStory(projectPath, storyId);
      console.log('[Header] loadStory result:', storyResult);

      if (storyResult.error) {
        setError(storyResult.error);
        setLoading(false);
        setLoadingStatus('');
        return;
      }

      if (storyResult.rooms) {
        setLoadingStatus(`Found ${storyResult.rooms.length} rooms`);
        setRooms(storyResult.rooms);
      }

      // Load existing layout if any
      setLoadingStatus('Checking for existing layout...');
      const layoutResult = await window.mapEditorApi.loadLayout(projectPath, storyId);

      if (layoutResult.exists && layoutResult.layout) {
        setLoadingStatus('Loading saved layout...');
        const layout = layoutResult.layout as {
          regions: Array<{
            id: string;
            name: string;
            color: string;
            anchor?: string;
            rooms: Array<{ roomId: string; x: number; y: number; z: number }>;
          }>;
          unassignedRooms?: string[];
        };

        // Reconcile: rooms in layout might not match current story rooms
        const allRoomIds = new Set(storyResult.rooms?.map(r => r.id) || []);
        const assignedRoomIds = new Set<string>();

        // Filter layout regions to only include valid rooms
        const validRegions = layout.regions.map(region => ({
          ...region,
          rooms: region.rooms.filter(r => {
            if (allRoomIds.has(r.roomId)) {
              assignedRoomIds.add(r.roomId);
              return true;
            }
            return false;
          }),
        }));

        // Unassigned = all rooms not in any region
        const unassigned = Array.from(allRoomIds).filter(id => !assignedRoomIds.has(id));

        loadLayout(validRegions, unassigned);
        setLoadingStatus(`Loaded ${validRegions.length} regions`);
      }
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  }

  async function handleSave() {
    if (!projectPath || !currentStory) return;

    setLoading(true);
    setError(null);

    try {
      const layout = {
        version: 1,
        storyId: currentStory,
        regions,
        unassignedRooms,
      };

      const result = await window.mapEditorApi.saveLayout(projectPath, currentStory, layout);

      if (result.error) {
        setError(result.error);
      } else {
        markClean();
      }
    } finally {
      setLoading(false);
    }
  }

  const projectName = projectPath?.split(/[/\\]/).pop() || '';

  const roomCount = rooms.size;
  const assignedCount = regions.reduce((sum, r) => sum + r.rooms.length, 0);

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">Map Editor</span>
        <span className="header-project">{projectName}</span>
      </div>

      <div className="header-center">
        <select
          value={currentStory || ''}
          onChange={handleStoryChange}
          disabled={isLoading}
        >
          <option value="">Select story...</option>
          {availableStories.map(story => (
            <option key={story} value={story}>{story}</option>
          ))}
        </select>
        {isLoading && loadingStatus && (
          <span className="header-loading">{loadingStatus}</span>
        )}
        {!isLoading && roomCount > 0 && (
          <span className="header-stats">
            {assignedCount}/{roomCount} rooms assigned
          </span>
        )}
      </div>

      <div className="header-right">
        {isDirty && <span className="header-dirty">Unsaved changes</span>}
        <button
          onClick={handleSave}
          disabled={!currentStory || isLoading || !isDirty}
        >
          Save
        </button>
      </div>
    </header>
  );
}
