import { useState, useCallback, useRef } from 'react';
import type { StreamChunk, TokenUsage } from '../services/llm';

interface UseStreamingResult {
  isStreaming: boolean;
  buffer: string;
  error: string | null;
  tokenUsage: TokenUsage | null;
  startStream: (generator: AsyncGenerator<StreamChunk>) => Promise<void>;
  stopStream: () => void;
  clearBuffer: () => void;
}

export function useStreaming(): UseStreamingResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [buffer, setBuffer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const abortRef = useRef(false);

  const startStream = useCallback(async (generator: AsyncGenerator<StreamChunk>) => {
    setIsStreaming(true);
    setBuffer('');
    setError(null);
    setTokenUsage(null);
    abortRef.current = false;

    try {
      for await (const chunk of generator) {
        if (abortRef.current) break;

        if (chunk.content) {
          setBuffer((prev) => prev + chunk.content);
        }
        if (chunk.usage) {
          setTokenUsage(chunk.usage);
        }
        if (chunk.done) {
          break;
        }
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Streaming failed');
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  const clearBuffer = useCallback(() => {
    setBuffer('');
    setError(null);
    setTokenUsage(null);
  }, []);

  return {
    isStreaming,
    buffer,
    error,
    tokenUsage,
    startStream,
    stopStream,
    clearBuffer,
  };
}
