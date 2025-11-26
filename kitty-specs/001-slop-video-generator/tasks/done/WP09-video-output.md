---
work_package_id: "WP09"
subtasks:
  - "T055"
  - "T056"
  - "T057"
  - "T058"
  - "T059"
  - "T060"
title: "Video Assembly Client & Output UI - User Story 6"
phase: "Phase 1 - Core Features"
lane: "done"
assignee: ""
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
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP09-video-output.md](kitty-specs/001-slop-video-generator/tasks/planned/WP09-video-output.md)*

# Work Package Prompt: WP09 – Video Assembly Client & Output UI - User Story 6

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- Frontend client sends assets to backend for assembly
- Progress indicator shown during assembly
- Video player displays completed video with standard controls
- Download button generates appropriate filename
- Stage transitions correctly through assembly → output

**Acceptance Criteria (from spec.md)**:
- US6.1: Video displayed in player with standard controls
- US6.2: Download produces valid video file with appropriate filename
- US6.3: Playback continues from seek position

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/contracts/video-assembly.yaml` - Backend API
  - `kitty-specs/001-slop-video-generator/spec.md` - FR-031 to FR-034
- **Dependencies**: WP08 (backend endpoint), WP07 (all assets ready)
- **Video format**: MP4 returned from backend
- **Filename format**: slop-video-YYYY-MM-DD.mp4

## Subtasks & Detailed Guidance

### Subtask T055 – Implement video assembly client

- **Purpose**: Send assets to backend and receive assembled video (FR-027)
- **Steps**:
  1. Create `frontend/src/services/video.ts`
  2. Build multipart form data with metadata, images, audio
  3. Handle response as blob
  ```typescript
  interface AssemblyMetadata {
    scenes: Array<{ index: number; imageDuration: number }>;
    resolution: { width: number; height: number };
    frameRate: number;
  }

  interface AssemblyResult {
    video: Blob;
    duration: number;
  }

  export async function assembleVideo(
    backendUrl: string,
    metadata: AssemblyMetadata,
    images: Blob[],
    audioFiles: Blob[]
  ): Promise<AssemblyResult> {
    const formData = new FormData();

    // Add metadata as JSON string
    formData.append('metadata', JSON.stringify(metadata));

    // Add images in order
    images.forEach((img, i) => {
      formData.append('images', img, `image_${i}.png`);
    });

    // Add audio files in order
    audioFiles.forEach((audio, i) => {
      formData.append('audio', audio, `audio_${i}.mp3`);
    });

    const response = await fetch(`${backendUrl}/assemble-video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Video assembly failed');
    }

    const video = await response.blob();
    const duration = parseFloat(response.headers.get('X-Video-Duration') || '0');

    return { video, duration };
  }
  ```
- **Files**: `frontend/src/services/video.ts`
- **Parallel?**: No (foundation for assembly screen)
- **Notes**: Use environment variable for backend URL

### Subtask T056 – Build VideoAssemblyScreen component

- **Purpose**: Container for assembly stage with progress indicator
- **Steps**:
  1. Create `frontend/src/components/video/VideoAssemblyScreen.tsx`
  2. Trigger assembly on mount
  3. Show progress indicator during assembly
  4. Transition to output stage on completion
  ```tsx
  export function VideoAssemblyScreen() {
    const { stage, setStage, setFinalVideo, isGenerating, setIsGenerating, setError } = useWorkflow();
    const { config } = useConfig();
    const { scenes } = useScenes();
    const { assets, timings } = useAssets();
    const [status, setStatus] = useState<'preparing' | 'uploading' | 'processing' | 'done'>('preparing');
    const [started, setStarted] = useState(false);

    useEffect(() => {
      if (stage === 'assembly' && !started) {
        setStarted(true);
        startAssembly();
      }
    }, [stage, started]);

    const startAssembly = async () => {
      setIsGenerating(true);
      setStatus('preparing');

      try {
        // Gather assets
        const images: Blob[] = [];
        const audioFiles: Blob[] = [];
        const sceneMetadata: Array<{ index: number; imageDuration: number }> = [];

        for (const scene of scenes) {
          const imageAsset = Array.from(assets.values())
            .find(a => a.sceneId === scene.id && a.type === 'image');
          const audioAsset = Array.from(assets.values())
            .find(a => a.sceneId === scene.id && a.type === 'audio');

          if (!imageAsset?.data || !audioAsset?.data) {
            throw new Error(`Missing assets for scene ${scene.index + 1}`);
          }

          images.push(imageAsset.data);
          audioFiles.push(audioAsset.data);

          // Get duration from timing or asset
          const timing = timings.get(audioAsset.id);
          const duration = timing?.totalDuration || audioAsset.duration || 10;

          sceneMetadata.push({
            index: scene.index,
            imageDuration: duration,
          });
        }

        setStatus('uploading');

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const result = await assembleVideo(
          backendUrl,
          {
            scenes: sceneMetadata,
            resolution: config.video.resolution,
            frameRate: config.video.frameRate,
          },
          images,
          audioFiles
        );

        setStatus('done');
        setFinalVideo(result.video);
        setStage('output');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Assembly failed';
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    };

    if (stage !== 'assembly') return null;

    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
        <h1 className="text-3xl font-bold mb-8">Assembling Video</h1>

        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="text-lg">
            {status === 'preparing' && 'Preparing assets...'}
            {status === 'uploading' && 'Uploading to server...'}
            {status === 'processing' && 'Processing video...'}
            {status === 'done' && 'Complete!'}
          </p>

          <p className="text-sm text-gray-500">
            This may take a few minutes depending on video length
          </p>
        </div>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/video/VideoAssemblyScreen.tsx`, `frontend/src/components/video/index.ts`
- **Parallel?**: No (container)

### Subtask T057 – Build VideoPlayer component

- **Purpose**: Display video with standard HTML5 controls (FR-032)
- **Steps**:
  1. Create `frontend/src/components/video/VideoPlayer.tsx`
  2. Use HTML5 video element with controls
  3. Create blob URL from video Blob
  4. Clean up blob URL on unmount
  ```tsx
  interface VideoPlayerProps {
    video: Blob;
  }

  export function VideoPlayer({ video }: VideoPlayerProps) {
    const [videoUrl, setVideoUrl] = useState<string>('');

    useEffect(() => {
      const url = URL.createObjectURL(video);
      setVideoUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }, [video]);

    if (!videoUrl) return null;

    return (
      <div className="w-full rounded-lg overflow-hidden bg-black">
        <video
          src={videoUrl}
          controls
          className="w-full max-h-[70vh]"
          autoPlay={false}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/video/VideoPlayer.tsx`
- **Parallel?**: Yes (after T056)
- **Notes**: Controls include play, pause, seek, volume, fullscreen

### Subtask T058 – Build DownloadButton component

- **Purpose**: Download video with appropriate filename (FR-033, FR-034)
- **Steps**:
  1. Create `frontend/src/components/video/DownloadButton.tsx`
  2. Generate filename with date
  3. Create download link and trigger click
  ```tsx
  interface DownloadButtonProps {
    video: Blob;
  }

  export function DownloadButton({ video }: DownloadButtonProps) {
    const handleDownload = () => {
      const url = URL.createObjectURL(video);
      const filename = `slop-video-${new Date().toISOString().split('T')[0]}.mp4`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Video
      </button>
    );
  }
  ```
- **Files**: `frontend/src/components/video/DownloadButton.tsx`
- **Parallel?**: Yes (after T056)

### Subtask T059 – Display assembly progress indicator

- **Purpose**: Visual feedback during backend processing (FR-031)
- **Steps**:
  1. Already included in T056 VideoAssemblyScreen
  2. Add optional progress percentage if backend supports it
  3. Show elapsed time counter
  ```tsx
  function ElapsedTimer() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);

      return () => clearInterval(interval);
    }, []);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return (
      <p className="text-sm text-gray-400">
        Elapsed: {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
    );
  }
  ```
- **Files**: `frontend/src/components/video/VideoAssemblyScreen.tsx`
- **Parallel?**: No (part of assembly screen)

### Subtask T060 – Create VideoOutputScreen and store final video

- **Purpose**: Display completed video with playback and download
- **Steps**:
  1. Create `frontend/src/components/video/VideoOutputScreen.tsx`
  2. Get final video from WorkflowContext
  3. Render VideoPlayer and DownloadButton
  4. Add "Start Over" button to reset workflow
  ```tsx
  export function VideoOutputScreen() {
    const { stage, finalVideo, reset } = useWorkflow();

    if (stage !== 'output' || !finalVideo) return null;

    const handleStartOver = () => {
      if (confirm('Start a new video? This will clear all current progress.')) {
        reset();
      }
    };

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Your Video is Ready!</h1>

        <VideoPlayer video={finalVideo} />

        <div className="flex justify-between items-center">
          <DownloadButton video={finalVideo} />

          <button
            onClick={handleStartOver}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Start New Video
          </button>
        </div>
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/video/VideoOutputScreen.tsx`
- **Parallel?**: No (final screen)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large video upload fails | Show progress, handle timeout gracefully |
| Backend unavailable | Clear error message with retry option |
| Video playback issues | Use standard MP4 codec (H.264 + AAC) |
| Memory usage with large video | Release blob URLs promptly |

## Definition of Done Checklist

- [ ] Video assembly client sends correct multipart data
- [ ] Assembly screen shows progress indicator
- [ ] Video player renders with standard controls
- [ ] Play, pause, seek, volume work correctly
- [ ] Download produces valid MP4 file
- [ ] Filename includes date
- [ ] Start Over resets workflow
- [ ] `tasks.md` updated with WP09 completion

## Review Guidance

- Test full workflow from scenes to output
- Verify video plays in browser
- Check downloaded file plays in external player
- Confirm seek functionality works

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T14:09:35Z – system – shell_pid= – lane=doing – Moved to doing
- 2025-11-26T15:15:00Z – claude – shell_pid=93343 – lane=doing – Completed implementation: Created index.ts exports, integrated VideoAssemblyScreen and VideoOutputScreen into App.tsx, fixed VideoPlayer lint error (replaced useState with useMemo for blob URL)
- 2025-11-26T14:50:47Z – claude – shell_pid=93343 – lane=for_review – Ready for review - all subtasks T055-T060 complete
- 2025-11-26T14:55:53Z – claude-reviewer – shell_pid=$$ – lane=done – Code review approved: Video assembly client, player, download, all screens
