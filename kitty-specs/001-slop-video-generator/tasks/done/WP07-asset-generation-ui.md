---
work_package_id: "WP07"
subtasks:
  - "T041"
  - "T042"
  - "T043"
  - "T044"
  - "T045"
  - "T046"
title: "Asset Generation UI - User Story 4"
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
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP07-asset-generation-ui.md](kitty-specs/001-slop-video-generator/tasks/planned/WP07-asset-generation-ui.md)*

# Work Package Prompt: WP07 – Asset Generation UI - User Story 4

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- Asset generation screen shows progress per scene
- Each scene displays image and audio status
- Failed assets show error message and retry button
- Overall progress indicator shows completion percentage
- "Assemble Video" button enabled when all assets complete

**Acceptance Criteria (from spec.md)**:
- US4.1: Each scene shows status (pending/generating/complete/failed)
- US4.2: Status updates immediately when asset completes
- US4.3: Failed assets show error message with retry option

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/spec.md` - User Story 4, FR-023, FR-026
  - `kitty-specs/001-slop-video-generator/data-model.md` - Asset, AssetStatus
- **Dependencies**: WP05 (image generation), WP06 (TTS generation), WP02 (AssetContext)
- **UX**: Real-time progress updates without page refresh

## Subtasks & Detailed Guidance

### Subtask T041 – Build AssetGenerationScreen component

- **Purpose**: Container for asset generation stage
- **Steps**:
  1. Create `frontend/src/components/assets/AssetGenerationScreen.tsx`
  2. Show heading and overall progress
  3. Render list of asset progress cards
  4. Trigger asset generation on mount
  ```tsx
  export function AssetGenerationScreen() {
    const { stage, isGenerating, setIsGenerating } = useWorkflow();
    const { scenes } = useScenes();
    const { assets, getAssetsByScene } = useAssets();
    const { generateImagesForScenes } = useImageGeneration();
    const { generateAudioForScenes } = useTTSGeneration();
    const [started, setStarted] = useState(false);

    useEffect(() => {
      if (stage === 'assets' && !started) {
        setStarted(true);
        setIsGenerating(true);

        Promise.all([
          generateImagesForScenes(),
          generateAudioForScenes(),
        ]).finally(() => {
          setIsGenerating(false);
        });
      }
    }, [stage, started]);

    if (stage !== 'assets') return null;

    // Calculate progress
    const totalAssets = scenes.length * 2; // image + audio per scene
    const completedAssets = Array.from(assets.values())
      .filter(a => a.status === 'complete').length;
    const failedAssets = Array.from(assets.values())
      .filter(a => a.status === 'failed').length;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Generating Assets</h1>
        <OverallProgress
          total={totalAssets}
          completed={completedAssets}
          failed={failedAssets}
        />
        <div className="space-y-4">
          {scenes.map((scene) => (
            <AssetProgressCard
              key={scene.id}
              scene={scene}
              assets={getAssetsByScene(scene.id)}
            />
          ))}
        </div>
        {completedAssets === totalAssets && (
          <AssembleVideoButton />
        )}
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/assets/AssetGenerationScreen.tsx`, `frontend/src/components/assets/index.ts`
- **Parallel?**: No (container for children)

### Subtask T042 – Build AssetProgressCard component

- **Purpose**: Display status for each scene's assets (FR-023)
- **Steps**:
  1. Create `frontend/src/components/assets/AssetProgressCard.tsx`
  2. Show scene number and preview (script snippet)
  3. Show image status with thumbnail when complete
  4. Show audio status with duration when complete
  5. Different styling for each status state
  ```tsx
  interface AssetProgressCardProps {
    scene: Scene;
    assets: { image?: Asset; audio?: Asset };
  }

  function StatusBadge({ status }: { status: AssetStatus }) {
    const styles = {
      pending: 'bg-gray-200 text-gray-700',
      generating: 'bg-blue-200 text-blue-700 animate-pulse',
      complete: 'bg-green-200 text-green-700',
      failed: 'bg-red-200 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  }

  export function AssetProgressCard({ scene, assets }: AssetProgressCardProps) {
    const { image, audio } = assets;

    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium">Scene {scene.index + 1}</h3>
            <p className="text-sm text-gray-500 truncate max-w-md">
              {scene.script.slice(0, 100)}...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Image status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Image</span>
              {image && <StatusBadge status={image.status} />}
            </div>
            {image?.status === 'complete' && image.dataUrl && (
              <img
                src={image.dataUrl}
                alt={`Scene ${scene.index + 1}`}
                className="w-full h-32 object-cover rounded"
              />
            )}
            {image?.status === 'failed' && (
              <div className="text-sm text-red-600">
                {image.error}
                <RetryButton assetId={image.id} type="image" sceneIndex={scene.index} />
              </div>
            )}
          </div>

          {/* Audio status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio</span>
              {audio && <StatusBadge status={audio.status} />}
            </div>
            {audio?.status === 'complete' && audio.duration && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔊</span>
                <span className="text-sm text-gray-600">
                  {audio.duration.toFixed(1)}s
                </span>
              </div>
            )}
            {audio?.status === 'failed' && (
              <div className="text-sm text-red-600">
                {audio.error}
                <RetryButton assetId={audio.id} type="audio" sceneIndex={scene.index} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/assets/AssetProgressCard.tsx`
- **Parallel?**: Yes (after T041)

### Subtask T043 – Build RetryButton component

- **Purpose**: Allow retry of failed individual assets (FR-026)
- **Steps**:
  1. Create `frontend/src/components/assets/RetryButton.tsx`
  2. On click: increment retry count, trigger regeneration
  3. Show loading state during retry
  ```tsx
  interface RetryButtonProps {
    assetId: string;
    type: 'image' | 'audio';
    sceneIndex: number;
  }

  export function RetryButton({ assetId, type, sceneIndex }: RetryButtonProps) {
    const [isRetrying, setIsRetrying] = useState(false);
    const { incrementRetryCount, updateAssetStatus } = useAssets();
    const { config } = useConfig();
    const { scenes } = useScenes();

    const handleRetry = async () => {
      setIsRetrying(true);
      incrementRetryCount(assetId);
      updateAssetStatus(assetId, 'generating');

      try {
        if (type === 'image') {
          const scene = scenes[sceneIndex];
          const size = `${config.video.resolution.width}x${config.video.resolution.height}`;

          const result = await generateImage(config.apiKeys.openai, {
            prompt: scene.imageDescription,
            model: config.image.model,
            quality: config.image.quality,
            size,
          });

          // Process image (brightness, transparency)
          const processed = await processImage(result.dataUrl, result.data);
          setAssetData(assetId, processed.data, processed.dataUrl);
          updateAssetStatus(assetId, 'complete');
        } else {
          const result = await generateTTSWithContext(
            config.apiKeys.elevenLabs,
            scenes,
            sceneIndex,
            {
              voiceId: config.tts.voiceId,
              modelId: config.tts.model,
              speed: config.tts.speed,
            }
          );

          const duration = await getAudioDuration(result.audio);
          setAssetData(assetId, result.audio, null, duration);
          updateAssetStatus(assetId, 'complete');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Retry failed';
        updateAssetStatus(assetId, 'failed', message);
      } finally {
        setIsRetrying(false);
      }
    };

    return (
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="ml-2 text-blue-600 hover:underline disabled:opacity-50"
      >
        {isRetrying ? 'Retrying...' : 'Retry'}
      </button>
    );
  }
  ```
- **Files**: `frontend/src/components/assets/RetryButton.tsx`
- **Parallel?**: Yes (after T041)

### Subtask T044 – Display overall progress bar/indicator

- **Purpose**: Show total completion progress
- **Steps**:
  1. Create OverallProgress component in AssetGenerationScreen or separate file
  2. Show progress bar with percentage
  3. Show counts: X complete, Y failed, Z pending
  ```tsx
  interface OverallProgressProps {
    total: number;
    completed: number;
    failed: number;
  }

  function OverallProgress({ total, completed, failed }: OverallProgressProps) {
    const percentage = Math.round((completed / total) * 100);
    const pending = total - completed - failed;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress: {completed} of {total} assets</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="text-green-600">{completed} complete</span>
          {failed > 0 && <span className="text-red-600">{failed} failed</span>}
          {pending > 0 && <span>{pending} pending</span>}
        </div>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/assets/AssetGenerationScreen.tsx` (inline or separate)
- **Parallel?**: No (part of main screen)

### Subtask T045 – Implement asset generation orchestration

- **Purpose**: Coordinate image and audio generation
- **Steps**:
  1. Update `frontend/src/hooks/useAssetGeneration.ts` to combine image and audio generation
  2. Export unified generateAllAssets function
  3. Handle parallel execution of images and audio
  ```typescript
  export function useAssetGeneration() {
    const { generateImagesForScenes } = useImageGeneration();
    const { generateAudioForScenes } = useTTSGeneration();
    const { setIsGenerating } = useWorkflow();

    const generateAllAssets = useCallback(async () => {
      setIsGenerating(true);

      try {
        // Run images and audio in parallel
        await Promise.all([
          generateImagesForScenes(),
          generateAudioForScenes(),
        ]);
      } finally {
        setIsGenerating(false);
      }
    }, [generateImagesForScenes, generateAudioForScenes, setIsGenerating]);

    return { generateAllAssets };
  }
  ```
- **Files**: `frontend/src/hooks/useAssetGeneration.ts`
- **Parallel?**: No (integration)

### Subtask T046 – Add "Assemble Video" button

- **Purpose**: Transition to video assembly stage
- **Steps**:
  1. Create AssembleVideoButton component
  2. Button enabled only when all assets complete
  3. On click: transition to 'assembly' stage
  ```tsx
  function AssembleVideoButton() {
    const { setStage } = useWorkflow();
    const { assets } = useAssets();

    const allComplete = Array.from(assets.values())
      .every(a => a.status === 'complete');

    const hasFailed = Array.from(assets.values())
      .some(a => a.status === 'failed');

    return (
      <div className="pt-4 border-t">
        {hasFailed && (
          <p className="text-amber-600 text-sm mb-4">
            Some assets failed. Retry them or proceed without them.
          </p>
        )}
        <button
          onClick={() => setStage('assembly')}
          disabled={!allComplete}
          className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {allComplete ? 'Assemble Video' : 'Waiting for assets...'}
        </button>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/assets/AssetGenerationScreen.tsx`
- **Parallel?**: No (final step)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| UI unresponsive during generation | Use React state updates, don't block main thread |
| Too many re-renders | Use React.memo, useMemo for expensive computations |
| Retry infinite loop | Track retry count, limit max retries |

## Definition of Done Checklist

- [ ] Asset generation screen renders correctly
- [ ] Each scene shows image and audio status
- [ ] Status badges update in real-time
- [ ] Failed assets show error and retry button
- [ ] Retry functionality works for both image and audio
- [ ] Overall progress bar accurate
- [ ] Assemble Video button enabled when complete
- [ ] `tasks.md` updated with WP07 completion

## Review Guidance

- Test with multiple scenes (10+)
- Simulate failures by temporarily using invalid API key
- Verify retry works independently per asset
- Check progress updates without page refresh

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T14:03:57Z – system – shell_pid= – lane=doing – Moved to doing
- 2025-11-26T14:06:33Z – system – shell_pid= – lane=for_review – Moved to for_review
- 2025-11-26T14:53:41Z – claude-reviewer – shell_pid=$$ – lane=done – Code review approved: Asset generation UI with progress, retry, and all status states
