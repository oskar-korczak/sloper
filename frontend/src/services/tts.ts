// TTS Service - ElevenLabs Text-to-Speech
// Full implementation in WP06, stub for WP05 compilation

import { ConcurrencyLimiter } from './images';

export interface TtsOptions {
  text: string;
  voiceId: string;
  model: string;
  speed: number;
  previousText?: string;
  nextText?: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface TtsResult {
  data: Blob;
  dataUrl: string;
  duration: number;
  timing?: {
    words: WordTiming[];
    totalDuration: number;
  };
}

/**
 * Generate TTS audio using ElevenLabs API
 * Uses previous_text/next_text for natural speech transitions
 */
export async function generateTtsAudio(
  apiKey: string,
  options: TtsOptions
): Promise<TtsResult> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: options.speed,
        },
        previous_text: options.previousText,
        next_text: options.nextText,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail?.message || `TTS generation failed: ${response.status}`);
  }

  const result = await response.json();

  // Decode base64 audio
  const audioBase64 = result.audio_base64;
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  const dataUrl = `data:audio/mpeg;base64,${audioBase64}`;

  // Parse alignment data for word timings
  const alignment = result.alignment;
  let timing: TtsResult['timing'] | undefined;

  if (alignment?.characters && alignment?.character_start_times_seconds && alignment?.character_end_times_seconds) {
    // Convert character-level alignment to word-level
    const words: WordTiming[] = [];
    let currentWord = '';
    let wordStart = 0;
    let wordEnd = 0;

    for (let i = 0; i < alignment.characters.length; i++) {
      const char = alignment.characters[i];
      const startTime = alignment.character_start_times_seconds[i];
      const endTime = alignment.character_end_times_seconds[i];

      if (char === ' ' || i === alignment.characters.length - 1) {
        if (i === alignment.characters.length - 1 && char !== ' ') {
          currentWord += char;
          wordEnd = endTime;
        }

        if (currentWord.trim()) {
          words.push({
            word: currentWord.trim(),
            start: wordStart,
            end: wordEnd,
          });
        }
        currentWord = '';
        wordStart = endTime;
      } else {
        if (currentWord === '') {
          wordStart = startTime;
        }
        currentWord += char;
        wordEnd = endTime;
      }
    }

    timing = {
      words,
      totalDuration: words.length > 0 ? words[words.length - 1].end : 0,
    };
  }

  // Calculate duration from audio or timing
  const duration = timing?.totalDuration || 0;

  return {
    data: blob,
    dataUrl,
    duration,
    timing,
  };
}

// TTS concurrency limiter (default 4 concurrent requests per spec)
export const ttsLimiter = new ConcurrencyLimiter<TtsResult>(4);
