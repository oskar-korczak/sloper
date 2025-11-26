---
work_package_id: "WP05"
subtasks:
  - "T030"
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
title: "Image Generation Service"
phase: "Phase 1 - Core Features"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "42143"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP05-image-generation.md](kitty-specs/001-slop-video-generator/tasks/planned/WP05-image-generation.md)*

# Work Package Prompt: WP05 – Image Generation Service

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- OpenAI image generation client works with configured model
- Images generated with max 12 concurrent requests
- Dark images automatically brightness-corrected
- Transparent images flattened to white background
- Asset status updates in AssetContext during generation
- Failed generations can be retried

**Acceptance Criteria (from spec.md)**:
- FR-018: Images generated from image descriptions
- FR-022: Max 12 concurrent image requests
- FR-024: Auto-correct dark images
- FR-025: Flatten transparent images to white background

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/research.md` - OpenAI image API, brightness correction
  - `kitty-specs/001-slop-video-generator/spec.md` - FR-018, FR-022, FR-024, FR-025
- **Dependencies**: WP02 (AssetContext), WP04 (scenes data)
- **Image format**: Request b64_json to avoid CORS on URLs
- **Brightness threshold**: Average RGB < 50 triggers correction

## Subtasks & Detailed Guidance

### Subtask T030 – Implement OpenAI image generation client

- **Purpose**: Generate images from scene descriptions (FR-018)
- **Steps**:
  1. Create `frontend/src/services/images.ts`
  2. Implement generateImage function:
     ```typescript
     interface ImageGenerationOptions {
       prompt: string;
       model: string;
       quality: 'low' | 'medium' | 'high';
       size: string; // e.g., "1024x1536"
     }

     export async function generateImage(
       apiKey: string,
       options: ImageGenerationOptions
     ): Promise<{ data: Blob; dataUrl: string }> {
       const response = await fetch('https://api.openai.com/v1/images/generations', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${apiKey}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           model: options.model,
           prompt: options.prompt,
           n: 1,
           size: options.size,
           quality: options.quality === 'high' ? 'hd' : 'standard',
           response_format: 'b64_json',
         }),
       });

       if (!response.ok) {
         const error = await response.json();
         throw new Error(error.error?.message || 'Image generation failed');
       }

       const result = await response.json();
       const base64 = result.data[0].b64_json;

       // Convert base64 to Blob
       const binaryString = atob(base64);
       const bytes = new Uint8Array(binaryString.length);
       for (let i = 0; i < binaryString.length; i++) {
         bytes[i] = binaryString.charCodeAt(i);
       }
       const blob = new Blob([bytes], { type: 'image/png' });
       const dataUrl = `data:image/png;base64,${base64}`;

       return { data: blob, dataUrl };
     }
     ```
- **Files**: `frontend/src/services/images.ts`
- **Parallel?**: No (foundation for image processing)
- **Notes**: OpenAI API supports CORS from browser

### Subtask T031 – Implement brightness detection algorithm

- **Purpose**: Detect dark images that need correction (FR-024)
- **Steps**:
  1. Add calculateBrightness function to `frontend/src/services/images.ts`
  2. Load image into canvas, get pixel data
  3. Calculate average brightness across all pixels
  4. Return brightness value (0-255)
  ```typescript
  export function calculateBrightness(imageDataUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let totalBrightness = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          // Calculate perceived brightness using luminance formula
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
          totalBrightness += brightness;
        }

        resolve(totalBrightness / pixelCount);
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }
  ```
- **Files**: `frontend/src/services/images.ts`
- **Parallel?**: Yes (after T030)

### Subtask T032 – Implement brightness correction using Canvas API

- **Purpose**: Auto-correct dark images (FR-024)
- **Steps**:
  1. Add correctBrightness function to `frontend/src/services/images.ts`
  2. Apply brightness and contrast adjustment
  3. Return corrected image as Blob and dataUrl
  ```typescript
  const BRIGHTNESS_THRESHOLD = 50;
  const BRIGHTNESS_BOOST = 1.5;
  const CONTRAST_BOOST = 1.2;

  export async function correctBrightness(
    imageDataUrl: string,
    targetBrightness: number = 100
  ): Promise<{ data: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;

        // Apply brightness/contrast filter
        ctx.filter = `brightness(${BRIGHTNESS_BOOST}) contrast(${CONTRAST_BOOST})`;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  export async function processImage(
    imageDataUrl: string,
    imageBlob: Blob
  ): Promise<{ data: Blob; dataUrl: string }> {
    const brightness = await calculateBrightness(imageDataUrl);

    if (brightness < BRIGHTNESS_THRESHOLD) {
      console.log(`Image brightness ${brightness} below threshold, correcting...`);
      return correctBrightness(imageDataUrl);
    }

    return { data: imageBlob, dataUrl: imageDataUrl };
  }
  ```
- **Files**: `frontend/src/services/images.ts`
- **Parallel?**: Yes (after T030)

### Subtask T033 – Implement transparency flattening

- **Purpose**: Flatten transparent images to white background (FR-025)
- **Steps**:
  1. Add flattenTransparency function to `frontend/src/services/images.ts`
  2. Draw white background, then image on top
  3. Check for transparency before processing
  ```typescript
  export function hasTransparency(imageDataUrl: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check alpha channel
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  export function flattenTransparency(
    imageDataUrl: string
  ): Promise<{ data: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image on top
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to flatten transparency'));
          }
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }
  ```
- **Files**: `frontend/src/services/images.ts`
- **Parallel?**: No (depends on T030)

### Subtask T034 – Build concurrency limiter

- **Purpose**: Limit concurrent image generation to 12 (FR-022)
- **Steps**:
  1. Add ConcurrencyLimiter class to `frontend/src/services/images.ts`
  2. Queue system with max concurrent limit
  ```typescript
  export class ConcurrencyLimiter<T> {
    private queue: Array<() => Promise<T>> = [];
    private running = 0;
    private maxConcurrent: number;

    constructor(maxConcurrent: number) {
      this.maxConcurrent = maxConcurrent;
    }

    async add(task: () => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await task();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        this.processQueue();
      });
    }

    private async processQueue() {
      while (this.running < this.maxConcurrent && this.queue.length > 0) {
        this.running++;
        const task = this.queue.shift()!;
        task().finally(() => {
          this.running--;
          this.processQueue();
        });
      }
    }
  }

  // Export singleton for image generation
  export const imageLimiter = new ConcurrencyLimiter<{ data: Blob; dataUrl: string }>(12);
  ```
- **Files**: `frontend/src/services/images.ts`
- **Parallel?**: No (needed for queue manager)

### Subtask T035 – Create image generation queue manager

- **Purpose**: Orchestrate image generation for all scenes
- **Steps**:
  1. Add image generation logic to `frontend/src/hooks/useAssetGeneration.ts`
  2. Create generateImagesForScenes function
  3. Update AssetContext status as images complete
  ```typescript
  export function useImageGeneration() {
    const { config } = useConfig();
    const { scenes } = useScenes();
    const { updateAssetStatus, setAssetData, getAssetsByScene } = useAssets();

    const generateImagesForScenes = useCallback(async () => {
      const size = `${config.video.resolution.width}x${config.video.resolution.height}`;

      const tasks = scenes.map((scene) => {
        const { image } = getAssetsByScene(scene.id);
        if (!image) return Promise.resolve();

        return imageLimiter.add(async () => {
          updateAssetStatus(image.id, 'generating');

          try {
            // Generate image
            const result = await generateImage(config.apiKeys.openai, {
              prompt: scene.imageDescription,
              model: config.image.model,
              quality: config.image.quality,
              size,
            });

            // Check and fix transparency
            const hasAlpha = await hasTransparency(result.dataUrl);
            let processed = result;
            if (hasAlpha) {
              processed = await flattenTransparency(result.dataUrl);
            }

            // Check and fix brightness
            processed = await processImage(processed.dataUrl, processed.data);

            setAssetData(image.id, processed.data, processed.dataUrl);
            updateAssetStatus(image.id, 'complete');

            return processed;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Image generation failed';
            updateAssetStatus(image.id, 'failed', message);
            throw error;
          }
        });
      });

      await Promise.allSettled(tasks);
    }, [config, scenes, updateAssetStatus, setAssetData, getAssetsByScene]);

    return { generateImagesForScenes };
  }
  ```
- **Files**: `frontend/src/hooks/useAssetGeneration.ts`
- **Parallel?**: No (final integration step)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Rate limiting (429 errors) | Exponential backoff on retries |
| Large images use memory | Release canvas resources after processing |
| Brightness correction too aggressive | Make threshold configurable |
| OpenAI API slow | Show per-image progress |

## Definition of Done Checklist

- [ ] Image generation works with OpenAI API
- [ ] Max 12 concurrent requests enforced
- [ ] Dark images auto-corrected
- [ ] Transparent images flattened to white
- [ ] Asset status updates during generation
- [ ] Failed images show error message
- [ ] `tasks.md` updated with WP05 completion

## Review Guidance

- Test with actual API key and multiple scenes
- Verify concurrency limit (check network tab)
- Test brightness correction with intentionally dark prompt
- Confirm transparency handling works

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T13:58:48Z – claude – shell_pid=42143 – lane=doing – Started implementation of Image Generation Service
