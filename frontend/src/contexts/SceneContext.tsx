import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Scene, SceneState } from '../types';

const defaultSceneState: SceneState = {
  scenes: [],
  isStreaming: false,
  streamBuffer: '',
};

interface SceneContextType {
  scenes: Scene[];
  isStreaming: boolean;
  streamBuffer: string;
  addScene: (scene: Omit<Scene, 'id'>) => void;
  updateScene: (id: string, updates: Partial<Omit<Scene, 'id'>>) => void;
  removeScene: (id: string) => void;
  setScenes: (scenes: Scene[] | ((prev: Scene[]) => Scene[])) => void;
  setIsStreaming: (streaming: boolean) => void;
  appendToStreamBuffer: (text: string) => void;
  clearStreamBuffer: () => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  clearScenes: () => void;
}

const SceneContext = createContext<SceneContextType | null>(null);

interface SceneProviderProps {
  children: ReactNode;
}

export function SceneProvider({ children }: SceneProviderProps) {
  const [state, setState] = useState<SceneState>(defaultSceneState);

  const addScene = (scene: Omit<Scene, 'id'>) => {
    const newScene: Scene = {
      ...scene,
      id: crypto.randomUUID(),
    };
    setState((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
  };

  const updateScene = (id: string, updates: Partial<Omit<Scene, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene) =>
        scene.id === id
          ? { ...scene, ...updates, isEdited: true }
          : scene
      ),
    }));
  };

  const removeScene = (id: string) => {
    setState((prev) => {
      const filteredScenes = prev.scenes.filter((scene) => scene.id !== id);
      // Re-index scenes after removal
      const reindexedScenes = filteredScenes.map((scene, index) => ({
        ...scene,
        index,
      }));
      return {
        ...prev,
        scenes: reindexedScenes,
      };
    });
  };

  const setScenes = (scenesOrUpdater: Scene[] | ((prev: Scene[]) => Scene[])) => {
    setState((prev) => ({
      ...prev,
      scenes: typeof scenesOrUpdater === 'function'
        ? scenesOrUpdater(prev.scenes)
        : scenesOrUpdater,
    }));
  };

  const setIsStreaming = (streaming: boolean) => {
    setState((prev) => ({
      ...prev,
      isStreaming: streaming,
    }));
  };

  const appendToStreamBuffer = (text: string) => {
    setState((prev) => ({
      ...prev,
      streamBuffer: prev.streamBuffer + text,
    }));
  };

  const clearStreamBuffer = () => {
    setState((prev) => ({
      ...prev,
      streamBuffer: '',
    }));
  };

  const reorderScenes = (fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const scenes = [...prev.scenes];
      const [movedScene] = scenes.splice(fromIndex, 1);
      scenes.splice(toIndex, 0, movedScene);
      // Re-index after reorder
      const reindexedScenes = scenes.map((scene, index) => ({
        ...scene,
        index,
      }));
      return {
        ...prev,
        scenes: reindexedScenes,
      };
    });
  };

  const clearScenes = () => {
    setState(defaultSceneState);
  };

  const value = useMemo(
    () => ({
      scenes: state.scenes,
      isStreaming: state.isStreaming,
      streamBuffer: state.streamBuffer,
      addScene,
      updateScene,
      removeScene,
      setScenes,
      setIsStreaming,
      appendToStreamBuffer,
      clearStreamBuffer,
      reorderScenes,
      clearScenes,
    }),
    [state]
  );

  return (
    <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
  );
}

export function useScenes(): SceneContextType {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScenes must be used within a SceneProvider');
  }
  return context;
}
