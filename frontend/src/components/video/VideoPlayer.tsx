import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  video: Blob;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    // Create new blob URL
    const url = URL.createObjectURL(video);
    urlRef.current = url;
    setVideoUrl(url);

    // Cleanup on unmount or when video changes
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [video]);

  if (!videoUrl) {
    return (
      <div className="w-full rounded-lg overflow-hidden bg-black shadow-lg flex items-center justify-center h-64">
        <p className="text-white">Loading video...</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden bg-black shadow-lg">
      <video
        src={videoUrl}
        controls
        className="w-full max-h-[70vh]"
        autoPlay={false}
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
