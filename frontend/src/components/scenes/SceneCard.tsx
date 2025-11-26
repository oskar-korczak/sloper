import { useState } from 'react';
import type { Scene } from '../../types';

interface SceneCardProps {
  scene: Scene;
  onUpdate: (updates: Partial<Omit<Scene, 'id'>>) => void;
  onDelete: () => void;
}

export function SceneCard({ scene, onUpdate, onDelete }: SceneCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">
            Scene {scene.index + 1}
          </span>
          {scene.isEdited && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              Edited
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
          >
            Delete
          </button>
          <span className="text-gray-400 text-sm">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Script
            </label>
            <textarea
              value={scene.script}
              onChange={(e) => onUpdate({ script: e.target.value })}
              placeholder="Enter the narration script for this scene..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {scene.script.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image Description
            </label>
            <textarea
              value={scene.imageDescription}
              onChange={(e) => onUpdate({ imageDescription: e.target.value })}
              placeholder="Describe the visual content for image generation..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}

      {!expanded && (
        <div className="px-4 py-2 text-sm text-gray-600 border-t border-gray-100 truncate">
          {scene.script || '(empty script)'}
        </div>
      )}
    </div>
  );
}
