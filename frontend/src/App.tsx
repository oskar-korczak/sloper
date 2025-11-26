import { ConfigProvider } from './contexts/ConfigContext';
import { SceneProvider } from './contexts/SceneContext';
import { AssetProvider } from './contexts/AssetContext';
import { WorkflowProvider } from './contexts/WorkflowContext';

function App() {
  return (
    <ConfigProvider>
      <SceneProvider>
        <AssetProvider>
          <WorkflowProvider>
            <main className="min-h-screen bg-gray-50">
              <div className="max-w-4xl mx-auto p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Slop Video Generator
                </h1>
                <p className="text-gray-600">
                  Video generation workflow coming soon...
                </p>
              </div>
            </main>
          </WorkflowProvider>
        </AssetProvider>
      </SceneProvider>
    </ConfigProvider>
  );
}

export default App;
