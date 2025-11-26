---
work_package_id: "WP06"
subtasks:
  - "T036"
  - "T037"
  - "T038"
  - "T039"
  - "T040"
title: "TTS Service with Context"
phase: "Phase 1 - Core Features"
lane: "doing"
assignee: ""
agent: "system"
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP06-tts-generation.md](kitty-specs/001-slop-video-generator/tasks/planned/WP06-tts-generation.md)*

# Work Package Prompt: WP06 – TTS Service with Context

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- ElevenLabs TTS client generates audio from scene scripts
- Previous/next text context passed for natural transitions
- Word-level timing data captured for video assembly
- Concurrency limited to configurable value (default 4)
- Asset status updates in AssetContext during generation

**Acceptance Criteria (from spec.md)**:
- FR-019: Audio generated from scripts with timing data
- FR-020: Surrounding scene context provided to TTS
- FR-021: TTS concurrency limited to configured value

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/research.md` - ElevenLabs API, context params
  - `kitty-specs/001-slop-video-generator/spec.md` - FR-019, FR-020, FR-021
  - `kitty-specs/001-slop-video-generator/data-model.md` - AudioTiming interface
- **Dependencies**: WP02 (AssetContext), WP04 (scenes data)
- **Audio format**: mp3_44100_128
- **Context params**: previous_text, next_text for natural speech flow

## Subtasks & Detailed Guidance

### Subtask T036 – Implement ElevenLabs TTS client

- **Purpose**: Generate audio from scene scripts (FR-019)
- **Steps**:
  1. Create `frontend/src/services/tts.ts`
  2. Implement generateTTS function:
     ```typescript
     interface TTSOptions {
       text: string;
       voiceId: string;
       modelId: string;
       speed: number;
       previousText?: string;
       nextText?: string;
     }

     interface TTSResult {
       audio: Blob;
       timing?: AudioTiming;
     }

     export async function generateTTS(
       apiKey: string,
       options: TTSOptions
     ): Promise<TTSResult> {
       const url = `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}`;

       const response = await fetch(url, {
         method: 'POST',
         headers: {
           'xi-api-key': apiKey,
           'Content-Type': 'application/json',
           'Accept': 'audio/mpeg',
         },
         body: JSON.stringify({
           text: options.text,
           model_id: options.modelId,
           voice_settings: {
             stability: 0.5,
             similarity_boost: 0.75,
             speed: options.speed,
           },
           previous_text: options.previousText || '',
           next_text: options.nextText || '',
         }),
       });

       if (!response.ok) {
         const error = await response.json().catch(() => ({ detail: 'TTS generation failed' }));
         throw new Error(error.detail?.message || error.detail || 'TTS generation failed');
       }

       const audio = await response.blob();
       return { audio };
     }
     ```
- **Files**: `frontend/src/services/tts.ts`
- **Parallel?**: No (foundation for TTS)
- **Notes**: ElevenLabs supports CORS from browser

### Subtask T037 – Implement previous_text/next_text context passing

- **Purpose**: Enable natural speech transitions between scenes (FR-020)
- **Steps**:
  1. Add generateTTSWithContext wrapper to `frontend/src/services/tts.ts`
  2. Accepts scenes array and current scene index
  3. Extracts context from adjacent scenes
  ```typescript
  export async function generateTTSWithContext(
    apiKey: string,
    scenes: Scene[],
    sceneIndex: number,
    config: { voiceId: string; modelId: string; speed: number }
  ): Promise<TTSResult> {
    const scene = scenes[sceneIndex];
    const previousScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;
    const nextScene = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1] : null;

    return generateTTS(apiKey, {
      text: scene.script,
      voiceId: config.voiceId,
      modelId: config.modelId,
      speed: config.speed,
      previousText: previousScene?.script,
      nextText: nextScene?.script,
    });
  }
  ```
- **Files**: `frontend/src/services/tts.ts`
- **Parallel?**: No (depends on T036)
- **Notes**: Empty string for first/last scene context

### Subtask T038 – Parse timing/alignment data from TTS response

- **Purpose**: Capture word-level timing for video assembly (FR-019)
- **Steps**:
  1. Update TTS request to include `with_timestamps: true` or use streaming endpoint
  2. Parse alignment data from response
  3. Note: ElevenLabs timing may require streaming endpoint or additional API call
  ```typescript
  // Alternative: Use streaming endpoint with timing
  export async function generateTTSWithTiming(
    apiKey: string,
    options: TTSOptions
  ): Promise<TTSResult> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: options.speed,
        },
        previous_text: options.previousText || '',
        next_text: options.nextText || '',
        output_format: 'mp3_44100_128',
      }),
    });

    if (!response.ok) {
      throw new Error('TTS generation failed');
    }

    const audio = await response.blob();

    // Calculate duration from audio (if timing not available from API)
    const duration = await getAudioDuration(audio);

    return {
      audio,
      timing: {
        assetId: '', // Will be set by caller
        words: [], // Timing data if available
        totalDuration: duration,
      },
    };
  }

  // Helper to get audio duration
  function getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = reject;
      audio.src = URL.createObjectURL(audioBlob);
    });
  }
  ```
- **Files**: `frontend/src/services/tts.ts`
- **Parallel?**: Yes (after T036)
- **Notes**: Duration is critical for video assembly; word timing is enhancement

### Subtask T039 – Build TTS concurrency limiter

- **Purpose**: Limit concurrent TTS requests to configured value (FR-021)
- **Steps**:
  1. Reuse ConcurrencyLimiter class from images.ts or create shared utility
  2. Create configurable limiter for TTS (default 4)
  ```typescript
  // Create TTS limiter with configurable concurrency
  export function createTTSLimiter(maxConcurrent: number = 4) {
    return new ConcurrencyLimiter<TTSResult>(maxConcurrent);
  }
  ```
- **Files**: `frontend/src/services/tts.ts`
- **Parallel?**: No (needed for integration)
- **Notes**: Concurrency configurable via config.tts.concurrency

### Subtask T040 – Integrate TTS generation into useAssetGeneration hook

- **Purpose**: Orchestrate TTS generation for all scenes
- **Steps**:
  1. Add TTS generation logic to `frontend/src/hooks/useAssetGeneration.ts`
  2. Create generateAudioForScenes function
  3. Update AssetContext with status and timing data
  ```typescript
  export function useTTSGeneration() {
    const { config } = useConfig();
    const { scenes } = useScenes();
    const { updateAssetStatus, setAssetData, setTiming, getAssetsByScene } = useAssets();

    const generateAudioForScenes = useCallback(async () => {
      const ttsLimiter = createTTSLimiter(config.tts.concurrency);

      const tasks = scenes.map((scene, index) => {
        const { audio } = getAssetsByScene(scene.id);
        if (!audio) return Promise.resolve();

        return ttsLimiter.add(async () => {
          updateAssetStatus(audio.id, 'generating');

          try {
            const result = await generateTTSWithContext(
              config.apiKeys.elevenLabs,
              scenes,
              index,
              {
                voiceId: config.tts.voiceId,
                modelId: config.tts.model,
                speed: config.tts.speed,
              }
            );

            // Get audio duration
            const duration = await getAudioDuration(result.audio);

            setAssetData(audio.id, result.audio, null, duration);

            if (result.timing) {
              setTiming(audio.id, {
                ...result.timing,
                assetId: audio.id,
                totalDuration: duration,
              });
            } else {
              setTiming(audio.id, {
                assetId: audio.id,
                words: [],
                totalDuration: duration,
              });
            }

            updateAssetStatus(audio.id, 'complete');

            return result;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'TTS generation failed';
            updateAssetStatus(audio.id, 'failed', message);
            throw error;
          }
        });
      });

      await Promise.allSettled(tasks);
    }, [config, scenes, updateAssetStatus, setAssetData, setTiming, getAssetsByScene]);

    return { generateAudioForScenes };
  }
  ```
- **Files**: `frontend/src/hooks/useAssetGeneration.ts`
- **Parallel?**: No (final integration step)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| TTS timeout | Retry with exponential backoff |
| API quota exhausted | Clear error message with quota info |
| Long audio files | Track duration, warn if video > expected |
| Context params ignored | Test with/without context to verify effect |

## Definition of Done Checklist

- [ ] ElevenLabs TTS client generates audio
- [ ] Previous/next text context passed to API
- [ ] Audio duration captured for each scene
- [ ] Concurrency limited to configured value
- [ ] Asset status updates during generation
- [ ] Timing data stored in AssetContext
- [ ] `tasks.md` updated with WP06 completion

## Review Guidance

- Test with actual ElevenLabs API key
- Verify context improves speech transitions (compare with/without)
- Check concurrency limit in network tab
- Confirm duration values are accurate

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T14:02:38Z – system – shell_pid= – lane=doing – Moved to doing
