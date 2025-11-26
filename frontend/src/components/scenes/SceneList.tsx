import { useScenes } from '../../contexts/SceneContext';
import { SceneCard } from './SceneCard';

export function SceneList() {
  const { scenes, updateScene, removeScene, addScene } = useScenes();

  const handleAddScene = () => {
    addScene({
      index: scenes.length,
      script: '',
      imageDescription: '',
      isEdited: true,
    });
  };

  if (scenes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No scenes generated yet.</p>
        <p className="text-sm mt-1">
          Enter a prompt above and click Generate Scenes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          onUpdate={(updates) => updateScene(scene.id, updates)}
          onDelete={() => removeScene(scene.id)}
        />
      ))}
      <button
        onClick={handleAddScene}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        + Add Scene
      </button>
    </div>
  );
}
