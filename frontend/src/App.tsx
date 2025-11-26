import { ConfigProvider } from './contexts/ConfigContext';
import { SceneProvider } from './contexts/SceneContext';
import { AssetProvider } from './contexts/AssetContext';
import { WorkflowProvider } from './contexts/WorkflowContext';
import { ConfigScreen } from './components/config';

function App() {
  return (
    <ConfigProvider>
      <SceneProvider>
        <AssetProvider>
          <WorkflowProvider>
            <main className="min-h-screen bg-gray-100">
              <ConfigScreen />
              {/* Other stage screens will be added here */}
            </main>
          </WorkflowProvider>
        </AssetProvider>
      </SceneProvider>
    </ConfigProvider>
  );
}

export default App;
