import { useEffect, useMemo, useRef } from 'react';

interface VideoPlayerProps {
  video: Blob;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const videoUrl = useMemo(() => URL.createObjectURL(video), [video]);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Revoke previous URL when video changes
    if (prevUrlRef.current && prevUrlRef.current !== videoUrl) {
      URL.revokeObjectURL(prevUrlRef.current);
    }
    prevUrlRef.current = videoUrl;

    // Cleanup on unmount
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

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
