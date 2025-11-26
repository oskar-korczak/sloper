import { useEffect, useMemo, useRef } from 'react';

interface VideoPlayerProps {
  video: Blob;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  // Create blob URL from video blob - memoized to prevent recreation
  const videoUrl = useMemo(() => URL.createObjectURL(video), [video]);
  const urlRef = useRef<string | null>(null);

  // Store current URL in ref for cleanup
  useEffect(() => {
    urlRef.current = videoUrl;
  }, [videoUrl]);

  // Cleanup blob URL on unmount or when video changes
  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, [video]);

  return (
    <div className="w-full rounded-lg overflow-hidden bg-black shadow-lg">
      <video
        src={videoUrl}
        controls
        className="w-full max-h-[70vh]"
        autoPlay={false}
        playsInline
        aria-label="Generated video preview"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
