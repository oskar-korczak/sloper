---
work_package_id: "WP04"
subtasks:
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
  - "T029"
title: "LLM Streaming Service & Scene Generation UI - User Story 1"
phase: "Phase 1 - Core Features"
lane: "done"
assignee: "claude"
agent: "claude-reviewer"
shell_pid: "$$"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP04-scene-generation.md](kitty-specs/001-slop-video-generator/tasks/planned/WP04-scene-generation.md)*

# Work Package Prompt: WP04 – LLM Streaming Service & Scene Generation UI - User Story 1

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- Streaming LLM client works for OpenAI and DeepSeek
- Scenes appear progressively as LLM streams response
- User can edit scene script and image_description
- User can add/remove scenes
- Token usage and cost estimate displayed after generation
- "Generate Assets" button transitions to asset generation stage

**Acceptance Criteria (from spec.md)**:
- US1.2: Scenes appear progressively as LLM response streams
- US1.3: Edits to script/image_description are preserved

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/research.md` - OpenAI streaming format, DeepSeek compatibility
  - `kitty-specs/001-slop-video-generator/spec.md` - FR-009 to FR-017
  - `kitty-specs/001-slop-video-generator/data-model.md` - Scene interface
- **Dependencies**: WP02 (SceneContext), WP03 (config settings)
- **Streaming format**: SSE with `data: {"choices":[{"delta":{"content":"..."}}]}\n\n`
- **Performance goal**: First scene visible within 5s of response start (SC-002)

## Subtasks & Detailed Guidance

### Subtask T020 – Implement OpenAI streaming client

- **Purpose**: Make streaming requests to OpenAI Chat Completions API (FR-010, FR-011)
- **Steps**:
  1. Create `frontend/src/services/llm.ts`
  2. Implement streamOpenAI function:
     ```typescript
     export async function* streamOpenAI(
       apiKey: string,
       model: string,
       systemPrompt: string,
       userPrompt: string,
       temperature: number
     ): AsyncGenerator<{ content?: string; usage?: TokenUsage; done?: boolean }> {
       const response = await fetch('https://api.openai.com/v1/chat/completions', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${apiKey}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           model,
           messages: [
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt },
           ],
           stream: true,
           stream_options: { include_usage: true },
           temperature,
         }),
       });

       if (!response.ok) {
         const error = await response.json();
         throw new Error(error.error?.message || 'OpenAI request failed');
       }

       const reader = response.body!.getReader();
       const decoder = new TextDecoder();

       while (true) {
         const { done, value } = await reader.read();
         if (done) break;

         const chunk = decoder.decode(value);
         // Parse SSE format - may contain multiple events
         const lines = chunk.split('\n');
         for (const line of lines) {
           if (line.startsWith('data: ')) {
             const data = line.slice(6);
             if (data === '[DONE]') {
               yield { done: true };
               return;
             }
             try {
               const parsed = JSON.parse(data);
               const content = parsed.choices?.[0]?.delta?.content;
               const usage = parsed.usage;
               if (content) yield { content };
               if (usage) yield { usage: { prompt: usage.prompt_tokens, completion: usage.completion_tokens } };
             } catch {
               // Skip malformed JSON
             }
           }
         }
       }
     }
     ```
- **Files**: `frontend/src/services/llm.ts`
- **Parallel?**: No (foundation for scene generation)
- **Notes**: OpenAI API supports CORS from browser

### Subtask T021 – Implement DeepSeek streaming client

- **Purpose**: Support DeepSeek as alternative LLM provider (FR-004)
- **Steps**:
  1. Add streamDeepSeek function to `frontend/src/services/llm.ts`
  2. Same interface as OpenAI (OpenAI-compatible API)
  3. Different base URL: `https://api.deepseek.com/v1/chat/completions`
  ```typescript
  export async function* streamDeepSeek(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number
  ): AsyncGenerator<{ content?: string; usage?: TokenUsage; done?: boolean }> {
    // Same implementation as streamOpenAI but with different URL
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      // ... same options
    });
    // ... same parsing logic
  }
  ```
  4. Add unified streamLLM function that delegates based on provider
- **Files**: `frontend/src/services/llm.ts`
- **Parallel?**: Yes (after T020)
- **Notes**: DeepSeek CORS support unconfirmed - may need error handling

### Subtask T022 – Create useStreaming hook

- **Purpose**: Reusable hook for parsing ReadableStream (FR-011)
- **Steps**:
  1. Create `frontend/src/hooks/useStreaming.ts`
  2. Hook manages streaming state and buffer
  3. Returns: { isStreaming, buffer, error, startStream, stopStream }
  ```typescript
  export function useStreaming() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [buffer, setBuffer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const startStream = useCallback(async (generator: AsyncGenerator<StreamChunk>) => {
      setIsStreaming(true);
      setBuffer('');
      setError(null);

      try {
        for await (const chunk of generator) {
          if (chunk.content) {
            setBuffer(prev => prev + chunk.content);
          }
          if (chunk.done) break;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Streaming failed');
      } finally {
        setIsStreaming(false);
      }
    }, []);

    const stopStream = useCallback(() => {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }, []);

    return { isStreaming, buffer, error, startStream, stopStream };
  }
  ```
- **Files**: `frontend/src/hooks/useStreaming.ts`
- **Parallel?**: No (needed for scene generation)

### Subtask T023 – Implement scene JSON parser with streaming buffer

- **Purpose**: Parse scenes progressively from streaming buffer (FR-012)
- **Steps**:
  1. Add parseSceneBuffer function to `frontend/src/services/llm.ts`
  2. Parse JSON array of scenes as they arrive
  3. Handle partial JSON gracefully
  4. Return array of complete scenes found so far
  ```typescript
  interface RawScene {
    script: string;
    image_description: string;
  }

  export function parseSceneBuffer(buffer: string): { scenes: RawScene[]; remainder: string } {
    // Try to find complete JSON objects in the buffer
    // LLM should output: [{"script": "...", "image_description": "..."}, ...]

    // Find the start of the array
    const arrayStart = buffer.indexOf('[');
    if (arrayStart === -1) return { scenes: [], remainder: buffer };

    const scenes: RawScene[] = [];
    let searchStart = arrayStart + 1;

    while (true) {
      // Find complete object: {...}
      const objStart = buffer.indexOf('{', searchStart);
      if (objStart === -1) break;

      // Find matching closing brace
      let depth = 0;
      let objEnd = -1;
      for (let i = objStart; i < buffer.length; i++) {
        if (buffer[i] === '{') depth++;
        if (buffer[i] === '}') depth--;
        if (depth === 0) {
          objEnd = i;
          break;
        }
      }

      if (objEnd === -1) break; // Incomplete object

      try {
        const obj = JSON.parse(buffer.slice(objStart, objEnd + 1));
        if (obj.script && obj.image_description) {
          scenes.push(obj);
        }
      } catch {
        // Malformed JSON, skip
      }

      searchStart = objEnd + 1;
    }

    return { scenes, remainder: buffer.slice(searchStart) };
  }
  ```
- **Files**: `frontend/src/services/llm.ts`
- **Parallel?**: No (needed for scene display)
- **Notes**: Handle malformed JSON gracefully with parse error option (edge case)

### Subtask T024 – Build SceneGenerationScreen component

- **Purpose**: Container for scene generation stage
- **Steps**:
  1. Create `frontend/src/components/scenes/SceneGenerationScreen.tsx`
  2. Show prompt input at top
  3. Show streaming indicator during generation
  4. Show scene list below
  5. Show token usage and cost after completion
  ```tsx
  export function SceneGenerationScreen() {
    const { stage } = useWorkflow();
    const { scenes, isStreaming } = useScenes();

    if (stage !== 'scenes') return null;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Generate Scenes</h1>
        <PromptInput />
        {isStreaming && (
          <div className="flex items-center gap-2 text-blue-600">
            <span className="animate-pulse">Generating scenes...</span>
          </div>
        )}
        <SceneList />
        {scenes.length > 0 && !isStreaming && <TokenUsageDisplay />}
        {scenes.length > 0 && !isStreaming && <GenerateAssetsButton />}
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/scenes/SceneGenerationScreen.tsx`, `frontend/src/components/scenes/index.ts`
- **Parallel?**: No (container for children)

### Subtask T025 – Build PromptInput component

- **Purpose**: Text area for user prompt with generate button (FR-009)
- **Steps**:
  1. Create `frontend/src/components/scenes/PromptInput.tsx`
  2. Multi-line textarea for creative prompt
  3. Generate button triggers LLM streaming
  4. Construct system prompt with target word count (FR-015)
  ```tsx
  export function PromptInput() {
    const [prompt, setPrompt] = useState('');
    const { config } = useConfig();
    const { setScenes, setIsStreaming, appendToStreamBuffer } = useScenes();
    const { setTokenUsage, setEstimatedCost, setError } = useWorkflow();

    const targetWords = Math.round(config.video.targetDuration * 2.5);

    const systemPrompt = `You are a video script generator. Generate exactly ${config.video.numScenes} scenes for a short video.
Each scene should have:
- "script": The narration text (keep total word count around ${targetWords} words)
- "image_description": A detailed visual description for image generation

Output as a JSON array: [{"script": "...", "image_description": "..."}, ...]`;

    const handleGenerate = async () => {
      if (!prompt.trim()) return;

      setScenes([]);
      setIsStreaming(true);

      const stream = config.llm.provider === 'openai'
        ? streamOpenAI(config.apiKeys.openai, config.llm.model, systemPrompt, prompt, config.temperature)
        : streamDeepSeek(config.apiKeys.deepseek!, config.llm.model, systemPrompt, prompt, config.temperature);

      // Process stream and parse scenes progressively
      // ... implementation
    };

    return (
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your video topic or idea..."
          className="w-full h-32 px-4 py-3 border rounded-lg resize-none"
        />
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Generate Scenes
        </button>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/scenes/PromptInput.tsx`
- **Parallel?**: Yes (after T024)

### Subtask T026 – Build SceneCard component

- **Purpose**: Collapsible, editable scene display (FR-013, FR-014)
- **Steps**:
  1. Create `frontend/src/components/scenes/SceneCard.tsx`
  2. Show scene number, script preview
  3. Collapsible content with full script and image_description
  4. Editable text areas when expanded
  5. Delete button
  ```tsx
  interface SceneCardProps {
    scene: Scene;
    onUpdate: (updates: Partial<Scene>) => void;
    onDelete: () => void;
  }

  export function SceneCard({ scene, onUpdate, onDelete }: SceneCardProps) {
    const [expanded, setExpanded] = useState(true);

    return (
      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="font-medium">Scene {scene.index + 1}</span>
          <div className="flex items-center gap-2">
            {scene.isEdited && <span className="text-xs text-blue-600">Edited</span>}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500">
              Delete
            </button>
            <span>{expanded ? '▼' : '▶'}</span>
          </div>
        </div>
        {expanded && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Script</label>
              <textarea
                value={scene.script}
                onChange={(e) => onUpdate({ script: e.target.value })}
                className="w-full h-24 px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image Description</label>
              <textarea
                value={scene.imageDescription}
                onChange={(e) => onUpdate({ imageDescription: e.target.value })}
                className="w-full h-24 px-3 py-2 border rounded"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/scenes/SceneCard.tsx`
- **Parallel?**: Yes (after T024)

### Subtask T027 – Build SceneList with add/remove functionality

- **Purpose**: Render scene cards with add scene button (FR-017)
- **Steps**:
  1. Create `frontend/src/components/scenes/SceneList.tsx`
  2. Map scenes to SceneCard components
  3. Add "Add Scene" button at bottom
  4. Handle scene reordering (optional: drag-and-drop)
  ```tsx
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
          className="w-full py-3 border-2 border-dashed rounded-lg text-gray-500 hover:bg-gray-50"
        >
          + Add Scene
        </button>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/scenes/SceneList.tsx`
- **Parallel?**: No (depends on T026)

### Subtask T028 – Display token usage and estimated cost

- **Purpose**: Show usage after generation (FR-016)
- **Steps**:
  1. Create `frontend/src/components/scenes/TokenUsageDisplay.tsx`
  2. Show prompt tokens, completion tokens, total
  3. Calculate estimated cost based on model pricing
  ```tsx
  const PRICING = {
    'gpt-4o': { prompt: 5, completion: 15 },
    'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
    'deepseek-chat': { prompt: 0.14, completion: 0.28 },
  };

  export function TokenUsageDisplay() {
    const { tokenUsage, estimatedCost } = useWorkflow();

    if (!tokenUsage) return null;

    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Token Usage</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Prompt:</span> {tokenUsage.prompt.toLocaleString()}
          </div>
          <div>
            <span className="text-gray-500">Completion:</span> {tokenUsage.completion.toLocaleString()}
          </div>
          <div>
            <span className="text-gray-500">Est. Cost:</span> ${estimatedCost?.toFixed(4)}
          </div>
        </div>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/scenes/TokenUsageDisplay.tsx`
- **Parallel?**: No (needs token data)

### Subtask T029 – Add "Generate Assets" button with stage transition

- **Purpose**: Progress to asset generation stage
- **Steps**:
  1. Add button component or section to SceneGenerationScreen
  2. Button disabled if no scenes or still streaming
  3. On click: transition to 'assets' stage
  4. Create initial asset entries in AssetContext for each scene
  ```tsx
  function GenerateAssetsButton() {
    const { scenes } = useScenes();
    const { setStage } = useWorkflow();
    const { createAsset } = useAssets();

    const handleClick = () => {
      // Create asset entries for each scene
      scenes.forEach((scene) => {
        createAsset(scene.id, 'image');
        createAsset(scene.id, 'audio');
      });
      setStage('assets');
    };

    return (
      <button
        onClick={handleClick}
        disabled={scenes.length === 0}
        className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50"
      >
        Generate Assets ({scenes.length} scenes)
      </button>
    );
  }
  ```
- **Files**: `frontend/src/components/scenes/SceneGenerationScreen.tsx`
- **Parallel?**: No (final step)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Malformed JSON from LLM | Graceful parse error with retry option |
| DeepSeek CORS blocked | Show clear error, suggest OpenAI |
| Slow streaming feels unresponsive | Show streaming indicator, first scene quickly |
| Large scene count | Virtualize list if > 50 scenes |

## Definition of Done Checklist

- [ ] OpenAI streaming client works end-to-end
- [ ] DeepSeek streaming client works (or clear error if CORS blocked)
- [ ] Scenes appear progressively during streaming
- [ ] Scene cards are collapsible and editable
- [ ] Add/remove scenes works correctly
- [ ] Token usage displays after generation
- [ ] Cost estimate displays after generation
- [ ] Generate Assets button transitions stage
- [ ] `tasks.md` updated with WP04 completion

## Review Guidance

- Test with actual OpenAI API key
- Verify progressive scene display (not all at once)
- Check edits persist in SceneContext
- Confirm scene index updates when adding/removing

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T13:33:56Z – claude – shell_pid=24353 – lane=doing – Started implementation of LLM Streaming Service & Scene Generation UI
- 2025-11-26T13:37:34Z – claude – shell_pid=27554 – lane=for_review – Completed implementation - LLM streaming with progressive scene display, all components working, lint/typecheck pass
- 2025-11-26T14:52:00Z – claude-reviewer – shell_pid=$$ – lane=done – Code review approved: LLM streaming with progressive scene parsing, all UI components
