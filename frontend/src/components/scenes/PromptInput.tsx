import { useState, useEffect, useRef } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useScenes } from '../../contexts/SceneContext';
import { useWorkflow } from '../../contexts/WorkflowContext';
import { streamLLM, parseSceneBuffer, calculateCost } from '../../services/llm';
import type { Scene } from '../../types';

export function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const { config } = useConfig();
  const { scenes, setScenes, setIsStreaming, isStreaming } = useScenes();
  const { setTokenUsage, setEstimatedCost, setError, setIsGenerating } = useWorkflow();

  const bufferRef = useRef('');
  const parsedCountRef = useRef(0);

  const targetWords = Math.round(config.video.targetDuration * 2.5);

  const systemPrompt = `You are a video script generator. Generate exactly ${config.video.numScenes} scenes for a short video.

Each scene should have:
- "script": The narration text (total across all scenes should be around ${targetWords} words)
- "image_description": A detailed visual description for image generation

Output ONLY a JSON array with no additional text: [{"script": "...", "image_description": "..."}, ...]

Make each scene's script flow naturally into the next. Image descriptions should be vivid and specific, suitable for AI image generation.`;

  const handleGenerate = async () => {
    if (!prompt.trim() || isStreaming) return;

    // Reset state
    setScenes([]);
    setIsStreaming(true);
    setIsGenerating(true);
    setError(null);
    bufferRef.current = '';
    parsedCountRef.current = 0;

    const apiKey = config.llm.provider === 'openai'
      ? config.apiKeys.openai ?? ''
      : config.apiKeys.deepseek ?? '';

    try {
      const stream = streamLLM(
        config.llm.provider,
        apiKey,
        config.llm.model,
        systemPrompt,
        prompt,
        config.temperature
      );

      for await (const chunk of stream) {
        if (chunk.content) {
          bufferRef.current += chunk.content;

          // Try to parse scenes from buffer
          const { scenes: parsedScenes } = parseSceneBuffer(bufferRef.current);

          // Add any new scenes
          if (parsedScenes.length > parsedCountRef.current) {
            const newScenes: Scene[] = parsedScenes.slice(parsedCountRef.current).map((raw, idx) => ({
              id: crypto.randomUUID(),
              index: parsedCountRef.current + idx,
              script: raw.script,
              imageDescription: raw.image_description,
              isEdited: false,
            }));

            setScenes((prev) => [...prev, ...newScenes]);
            parsedCountRef.current = parsedScenes.length;
          }
        }

        if (chunk.usage) {
          setTokenUsage(chunk.usage);
          const cost = calculateCost(config.llm.model, chunk.usage);
          setEstimatedCost(cost);
        }

        if (chunk.done) break;
      }

      // Final parse to catch any remaining scenes
      const { scenes: finalScenes } = parseSceneBuffer(bufferRef.current);
      if (finalScenes.length > parsedCountRef.current) {
        const newScenes: Scene[] = finalScenes.slice(parsedCountRef.current).map((raw, idx) => ({
          id: crypto.randomUUID(),
          index: parsedCountRef.current + idx,
          script: raw.script,
          imageDescription: raw.image_description,
          isEdited: false,
        }));

        setScenes((prev) => [...prev, ...newScenes]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsStreaming(false);
      setIsGenerating(false);
    }
  };

  // Re-index scenes when they change
  useEffect(() => {
    // This is just for display, actual reindexing happens in SceneContext
  }, [scenes]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Video Topic or Idea
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your video topic or idea... (e.g., 'A journey through the solar system' or 'The history of coffee')"
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isStreaming}
        />
        <p className="text-xs text-gray-500 mt-1">
          Target: {config.video.numScenes} scenes, ~{targetWords} words total, {config.video.targetDuration}s video
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isStreaming}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            'Generate Scenes'
          )}
        </button>

        {scenes.length > 0 && !isStreaming && (
          <button
            onClick={() => {
              setScenes([]);
              setPrompt('');
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
