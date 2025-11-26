# Data Model: Slop Video Generator

State entities for the React application and backend API.

## Summary

- **Feature**: 001-slop-video-generator
- **Date**: 2025-11-26
- **Storage**: Browser memory (React Context) for frontend, request-scoped for backend

## Entities

### Entity: Configuration

In-memory state for user settings and API credentials.

- **Description**: User-provided API keys and video generation settings
- **Attributes**:
  - `openaiApiKey` (string) - OpenAI API key for LLM and images
  - `deepseekApiKey` (string | null) - Optional DeepSeek API key
  - `elevenLabsApiKey` (string) - ElevenLabs API key for TTS
  - `llmProvider` ('openai' | 'deepseek') - Selected LLM provider
  - `llmModel` (string) - Selected model ID (e.g., 'gpt-4o', 'deepseek-chat')
  - `resolution` ({ width: number, height: number }) - Video resolution, default 1024x1536
  - `frameRate` (number) - Video FPS, default 24
  - `numScenes` (number) - Target scene count, default 18
  - `targetDuration` (number) - Target video duration in seconds, default 180
  - `imageModel` (string) - Image generation model, default 'gpt-image-1'
  - `imageQuality` ('low' | 'medium' | 'high') - Image quality setting, default 'low'
  - `ttsModel` (string) - TTS model, default 'eleven_multilingual_v2'
  - `ttsVoiceId` (string) - ElevenLabs voice ID, default 'Bx2lBwIZJBilRBVc3AGO'
  - `ttsSpeed` (number) - TTS speed multiplier, default 1.1
  - `ttsConcurrency` (number) - Max concurrent TTS requests, default 4
  - `temperature` (number) - LLM temperature, default 0.7
- **Identifiers**: None (singleton per session)
- **Lifecycle Notes**: Created on app load with defaults, updated by user, cleared on page close

### Entity: Scene

A single scene in the video, containing script and image description.

- **Description**: Represents one segment of the generated video
- **Attributes**:
  - `id` (string) - Unique identifier (UUID)
  - `index` (number) - Order in sequence (0-based)
  - `script` (string) - Narration text for TTS
  - `imageDescription` (string) - Description for image generation
  - `isEdited` (boolean) - Whether user has modified this scene
- **Identifiers**: `id` (primary)
- **Lifecycle Notes**: Created during LLM streaming, can be edited/deleted by user, passed to asset generation

### Entity: Asset

Generated image or audio file for a scene.

- **Description**: A media asset (image or audio) generated for a scene
- **Attributes**:
  - `id` (string) - Unique identifier (UUID)
  - `sceneId` (string) - Reference to parent Scene
  - `type` ('image' | 'audio') - Asset type
  - `status` ('pending' | 'generating' | 'complete' | 'failed') - Generation status
  - `data` (Blob | null) - Binary data when complete
  - `dataUrl` (string | null) - Data URL for display (images)
  - `duration` (number | null) - Duration in seconds (audio only)
  - `error` (string | null) - Error message if failed
  - `retryCount` (number) - Number of retry attempts
- **Identifiers**: `id` (primary), `sceneId` + `type` (unique constraint)
- **Lifecycle Notes**: Created when asset generation starts, updated on progress/completion/failure

### Entity: AudioTiming

Timing information for audio synchronization.

- **Description**: Word-level timing data from TTS for video assembly
- **Attributes**:
  - `assetId` (string) - Reference to parent Asset
  - `words` (Array<{ word: string, start: number, end: number }>) - Word timestamps
  - `totalDuration` (number) - Total audio duration in seconds
- **Identifiers**: `assetId` (primary)
- **Lifecycle Notes**: Created alongside audio asset, used for video assembly

### Entity: WorkflowState

Current state of the multi-stage workflow.

- **Description**: Tracks which stage the user is in and overall progress
- **Attributes**:
  - `stage` ('config' | 'scenes' | 'assets' | 'assembly' | 'output') - Current workflow stage
  - `isGenerating` (boolean) - Whether a generation is in progress
  - `error` (string | null) - Current error message if any
  - `tokenUsage` ({ prompt: number, completion: number } | null) - LLM token usage
  - `estimatedCost` (number | null) - Estimated API cost in USD
- **Identifiers**: None (singleton)
- **Lifecycle Notes**: Created on app load, updated as user progresses through workflow

### Entity: VideoAssemblyRequest (Backend)

Request payload for video assembly API.

- **Description**: Data sent to backend for FFmpeg video assembly
- **Attributes**:
  - `scenes` (Array<{ index: number, imageDuration: number }>) - Scene order and timing
  - `images` (Array<File>) - Image files in order
  - `audioFiles` (Array<File>) - Audio files in order
  - `resolution` ({ width: number, height: number }) - Output resolution
  - `frameRate` (number) - Output FPS
- **Identifiers**: None (request-scoped)
- **Lifecycle Notes**: Created per request, discarded after response

### Entity: VideoAssemblyResponse (Backend)

Response from video assembly API.

- **Description**: Result of FFmpeg video assembly
- **Attributes**:
  - `success` (boolean) - Whether assembly succeeded
  - `videoData` (Blob | null) - Video file binary data if success
  - `duration` (number | null) - Video duration in seconds
  - `error` (string | null) - Error message if failed
- **Identifiers**: None (response-scoped)
- **Lifecycle Notes**: Returned to frontend, video stored in memory for playback/download

## Relationships

| Source | Relation | Target | Cardinality | Notes |
|--------|----------|--------|-------------|-------|
| Scene | has | Asset | 1:2 | Each scene has exactly one image and one audio asset |
| Asset (audio) | has | AudioTiming | 1:1 | Each audio asset has timing data |
| Configuration | configures | Scene generation | 1:N | Config settings affect all scenes |
| WorkflowState | tracks | All entities | 1:1 | Workflow state is global |

## State Shape (React Context)

```typescript
// ConfigContext
interface ConfigState {
  apiKeys: {
    openai: string;
    deepseek: string | null;
    elevenLabs: string;
  };
  llm: {
    provider: 'openai' | 'deepseek';
    model: string;
  };
  video: {
    resolution: { width: number; height: number };
    frameRate: number;
    numScenes: number;
    targetDuration: number;
  };
  image: {
    model: string;
    quality: 'low' | 'medium' | 'high';
  };
  tts: {
    model: string;
    voiceId: string;
    speed: number;
    concurrency: number;
  };
  temperature: number;
}

// SceneContext
interface SceneState {
  scenes: Scene[];
  isStreaming: boolean;
  streamBuffer: string;
}

// AssetContext
interface AssetState {
  assets: Map<string, Asset>; // keyed by assetId
  timings: Map<string, AudioTiming>; // keyed by assetId
  generationQueue: string[]; // asset IDs pending generation
}

// WorkflowContext
interface WorkflowState {
  stage: 'config' | 'scenes' | 'assets' | 'assembly' | 'output';
  isGenerating: boolean;
  error: string | null;
  tokenUsage: { prompt: number; completion: number } | null;
  estimatedCost: number | null;
  finalVideo: Blob | null;
}
```

## Validation & Governance

- **Data quality requirements**:
  - API keys must be non-empty strings before proceeding from config stage
  - Scene script and imageDescription must be non-empty
  - Asset data must be valid Blob when status is 'complete'

- **Compliance considerations**:
  - API keys stored in memory only, never persisted
  - No user data sent to backend (only generated assets)
  - Generated content subject to API provider terms

- **Source of truth**:
  - Configuration: ConfigContext
  - Scenes: SceneContext
  - Assets: AssetContext
  - Workflow: WorkflowContext
