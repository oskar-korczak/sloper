// Image Generation Service
// Handles OpenAI image generation with brightness correction and transparency flattening

export interface ImageGenerationOptions {
  prompt: string;
  model: string;
  quality: 'low' | 'medium' | 'high';
  size: string; // e.g., "1024x1536"
}

export interface ImageResult {
  data: Blob;
  dataUrl: string;
}

// Constants for image processing
const BRIGHTNESS_THRESHOLD = 50;
const BRIGHTNESS_BOOST = 1.5;
const CONTRAST_BOOST = 1.2;

/**
 * Generate an image using OpenAI's image generation API
 */
export async function generateImage(
  apiKey: string,
  options: ImageGenerationOptions
): Promise<ImageResult> {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
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

/**
 * Calculate the average brightness of an image
 * Returns a value from 0 (black) to 255 (white)
 */
export function calculateBrightness(imageDataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
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
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        totalBrightness += brightness;
      }

      resolve(totalBrightness / pixelCount);
    };
    img.onerror = () => reject(new Error('Failed to load image for brightness calculation'));
    img.src = imageDataUrl;
  });
}

/**
 * Apply brightness and contrast correction to a dark image
 */
export function correctBrightness(imageDataUrl: string): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Apply brightness/contrast filter
      ctx.filter = `brightness(${BRIGHTNESS_BOOST}) contrast(${CONTRAST_BOOST})`;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for brightness correction'));
    img.src = imageDataUrl;
  });
}

/**
 * Check if an image has any transparent pixels
 */
export function hasTransparency(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check alpha channel (every 4th byte starting at index 3)
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    };
    img.onerror = () => reject(new Error('Failed to load image for transparency check'));
    img.src = imageDataUrl;
  });
}

/**
 * Flatten transparent image to white background
 */
export function flattenTransparency(imageDataUrl: string): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw image on top
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to flatten transparency'));
          }
        },
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for transparency flattening'));
    img.src = imageDataUrl;
  });
}

/**
 * Process an image: check brightness and transparency, apply corrections if needed
 */
export async function processImage(
  imageDataUrl: string,
  imageBlob: Blob
): Promise<ImageResult> {
  let result: ImageResult = { data: imageBlob, dataUrl: imageDataUrl };

  // Check and fix transparency first
  const transparent = await hasTransparency(imageDataUrl);
  if (transparent) {
    console.log('Image has transparency, flattening to white background...');
    result = await flattenTransparency(result.dataUrl);
  }

  // Check and fix brightness
  const brightness = await calculateBrightness(result.dataUrl);
  if (brightness < BRIGHTNESS_THRESHOLD) {
    console.log(`Image brightness ${brightness.toFixed(1)} below threshold ${BRIGHTNESS_THRESHOLD}, correcting...`);
    result = await correctBrightness(result.dataUrl);
  }

  return result;
}

/**
 * Concurrency limiter for parallel task execution
 */
export class ConcurrencyLimiter<T> {
  private queue: Array<{
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: unknown) => void;
  }> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.running++;
      item
        .task()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.running--;
          this.processQueue();
        });
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get runningCount(): number {
    return this.running;
  }
}

// Export singleton limiters
export const imageLimiter = new ConcurrencyLimiter<ImageResult>(12);
