import { useEditorStore } from './store/editor-store';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Canvas } from './components/Canvas/Canvas';
import { WelcomeScreen } from './components/WelcomeScreen';
import './styles/app.css';

function App() {
  const projectPath = useEditorStore(state => state.projectPath);
  const currentStory = useEditorStore(state => state.currentStory);
  const rooms = useEditorStore(state => state.rooms);

  // Show welcome screen if no project loaded
  if (!projectPath) {
    return <WelcomeScreen />;
  }

  // Show loading/story selection if no story loaded
  const hasRooms = rooms.size > 0;

  return (
    <div className="app">
      <Header />
      <div className="app-body">
        {currentStory && hasRooms ? (
          <>
            <Sidebar />
            <Canvas />
          </>
        ) : (
          <div className="app-message">
            {currentStory ? (
              <p>Loading rooms...</p>
            ) : (
              <p>Select a story from the dropdown above</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
