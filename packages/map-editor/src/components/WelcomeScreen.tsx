import { useEditorStore } from '../store/editor-store';
import './WelcomeScreen.css';

export function WelcomeScreen() {
  const setProject = useEditorStore(state => state.setProject);
  const setError = useEditorStore(state => state.setError);
  const error = useEditorStore(state => state.error);

  async function handleOpenProject() {
    const result = await window.mapEditorApi.openProject();

    if (!result) {
      // User cancelled
      return;
    }

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.path && result.stories) {
      setProject(result.path, result.stories);
    }
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1>Sharpee Map Editor</h1>
        <p className="welcome-subtitle">Visual region layout editor for Interactive Fiction</p>

        <button className="primary open-button" onClick={handleOpenProject}>
          Open Project
        </button>

        <p className="welcome-hint">
          Select your Sharpee project folder (the one containing <code>stories/</code> and <code>dist/</code>)
        </p>

        {error && (
          <div className="welcome-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
