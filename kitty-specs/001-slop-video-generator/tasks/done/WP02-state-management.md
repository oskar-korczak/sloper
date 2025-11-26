---
work_package_id: "WP02"
subtasks:
  - "T008"
  - "T009"
  - "T010"
  - "T011"
  - "T012"
title: "React Context State Management"
phase: "Phase 0 - Setup"
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
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP02-state-management.md](kitty-specs/001-slop-video-generator/tasks/planned/WP02-state-management.md)*

# Work Package Prompt: WP02 – React Context State Management

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- All four React Contexts implemented: ConfigContext, SceneContext, AssetContext, WorkflowContext
- Each context provides state and update functions
- Default values match spec requirements (FR-008)
- App renders without errors with all providers
- useContext hooks work correctly in child components

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/data-model.md` - State shapes
  - `kitty-specs/001-slop-video-generator/spec.md` - Default values (FR-008)
  - `frontend/src/types/index.ts` - TypeScript interfaces (from WP01)
- **Architecture**: React Context + useState (no external state libraries)
- **Dependencies**: WP01 must be complete (types defined)

## Subtasks & Detailed Guidance

### Subtask T008 – Implement ConfigContext

- **Purpose**: Manage API keys, LLM settings, video settings, TTS settings
- **Steps**:
  1. Create `frontend/src/contexts/ConfigContext.tsx`
  2. Define ConfigContextType interface with state and actions
  3. Create default config with values from FR-008:
     ```typescript
     const defaultConfig: ConfigState = {
       apiKeys: { openai: '', deepseek: null, elevenLabs: '' },
       llm: { provider: 'openai', model: 'gpt-4o' },
       video: {
         resolution: { width: 1024, height: 1536 },
         frameRate: 24,
         numScenes: 18,
         targetDuration: 180,
       },
       image: { model: 'gpt-image-1', quality: 'low' },
       tts: {
         model: 'eleven_multilingual_v2',
         voiceId: 'Bx2lBwIZJBilRBVc3AGO',
         speed: 1.1,
         concurrency: 4,
       },
       temperature: 0.7,
     };
     ```
  4. Implement actions: updateApiKeys, updateLlm, updateVideo, updateImage, updateTts, updateTemperature
  5. Export ConfigProvider and useConfig hook
- **Files**: `frontend/src/contexts/ConfigContext.tsx`
- **Parallel?**: No (others can parallel with this)
- **Notes**: Use `useMemo` for context value to prevent unnecessary re-renders

### Subtask T009 – Implement SceneContext

- **Purpose**: Manage generated scenes array and streaming state
- **Steps**:
  1. Create `frontend/src/contexts/SceneContext.tsx`
  2. Define SceneContextType with state and actions:
     ```typescript
     interface SceneContextType {
       scenes: Scene[];
       isStreaming: boolean;
       streamBuffer: string;
       addScene: (scene: Omit<Scene, 'id'>) => void;
       updateScene: (id: string, updates: Partial<Scene>) => void;
       removeScene: (id: string) => void;
       setScenes: (scenes: Scene[]) => void;
       setIsStreaming: (streaming: boolean) => void;
       appendToStreamBuffer: (text: string) => void;
       clearStreamBuffer: () => void;
       reorderScenes: (fromIndex: number, toIndex: number) => void;
     }
     ```
  3. Generate UUIDs for scene IDs using `crypto.randomUUID()`
  4. Maintain index ordering when adding/removing scenes
  5. Export SceneProvider and useScenes hook
- **Files**: `frontend/src/contexts/SceneContext.tsx`
- **Parallel?**: Yes (after T008)
- **Notes**: Scene `isEdited` flag should be set true when updateScene called

### Subtask T010 – Implement AssetContext

- **Purpose**: Track generated assets (images, audio) and their status
- **Steps**:
  1. Create `frontend/src/contexts/AssetContext.tsx`
  2. Use Map for assets keyed by asset ID
  3. Define AssetContextType with state and actions:
     ```typescript
     interface AssetContextType {
       assets: Map<string, Asset>;
       timings: Map<string, AudioTiming>;
       generationQueue: string[];
       createAsset: (sceneId: string, type: AssetType) => string; // returns asset ID
       updateAssetStatus: (assetId: string, status: AssetStatus, error?: string) => void;
       setAssetData: (assetId: string, data: Blob, dataUrl?: string, duration?: number) => void;
       setTiming: (assetId: string, timing: AudioTiming) => void;
       addToQueue: (assetIds: string[]) => void;
       removeFromQueue: (assetId: string) => void;
       incrementRetryCount: (assetId: string) => void;
       getAssetsByScene: (sceneId: string) => { image?: Asset; audio?: Asset };
     }
     ```
  4. Export AssetProvider and useAssets hook
- **Files**: `frontend/src/contexts/AssetContext.tsx`
- **Parallel?**: Yes (after T008)
- **Notes**: Convert Map to/from entries for state updates to trigger re-renders

### Subtask T011 – Implement WorkflowContext

- **Purpose**: Track current workflow stage and overall progress
- **Steps**:
  1. Create `frontend/src/contexts/WorkflowContext.tsx`
  2. Define WorkflowContextType with state and actions:
     ```typescript
     interface WorkflowContextType {
       stage: WorkflowStage;
       isGenerating: boolean;
       error: string | null;
       tokenUsage: { prompt: number; completion: number } | null;
       estimatedCost: number | null;
       finalVideo: Blob | null;
       setStage: (stage: WorkflowStage) => void;
       setIsGenerating: (generating: boolean) => void;
       setError: (error: string | null) => void;
       setTokenUsage: (usage: { prompt: number; completion: number }) => void;
       setEstimatedCost: (cost: number) => void;
       setFinalVideo: (video: Blob) => void;
       reset: () => void;
     }
     ```
  3. Stage transitions: config → scenes → assets → assembly → output
  4. Default stage is 'config'
  5. Export WorkflowProvider and useWorkflow hook
- **Files**: `frontend/src/contexts/WorkflowContext.tsx`
- **Parallel?**: Yes (after T008)
- **Notes**: reset() should clear all state and return to config stage

### Subtask T012 – Create context provider wrapper

- **Purpose**: Compose all providers in App.tsx
- **Steps**:
  1. Update `frontend/src/App.tsx` to wrap with all providers:
     ```tsx
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
                   {/* Stage-based content will go here */}
                   <h1 className="text-2xl font-bold p-4">Slop Video Generator</h1>
                 </main>
               </WorkflowProvider>
             </AssetProvider>
           </SceneProvider>
         </ConfigProvider>
       );
     }
     ```
  2. Verify app renders without context errors
  3. Add a simple test component that uses all hooks to verify they work
- **Files**: `frontend/src/App.tsx`
- **Parallel?**: No (requires T008-T011)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Context re-render performance | Use useMemo for context values |
| Map state not triggering updates | Create new Map instance on updates |
| Missing provider causing runtime error | Use default values in useContext |

## Definition of Done Checklist

- [ ] ConfigContext exports ConfigProvider and useConfig
- [ ] SceneContext exports SceneProvider and useScenes
- [ ] AssetContext exports AssetProvider and useAssets
- [ ] WorkflowContext exports WorkflowProvider and useWorkflow
- [ ] App.tsx wraps with all providers
- [ ] App renders without errors
- [ ] Default values match FR-008 specification
- [ ] `tasks.md` updated with WP02 completion

## Review Guidance

- Verify context value types match interfaces in types/index.ts
- Check default config values against FR-008 in spec.md
- Confirm all actions are exported and callable
- Test that useContext hooks return expected values

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T13:25:29Z – claude – shell_pid=17795 – lane=doing – Started implementation of React Context state management
- 2025-11-26T13:29:30Z – claude – shell_pid=20824 – lane=for_review – Completed implementation - all contexts implemented with providers wrapped in App.tsx, lint/typecheck pass
- 2025-11-26T14:57:00Z – claude-reviewer – lane=done – Code review approved
