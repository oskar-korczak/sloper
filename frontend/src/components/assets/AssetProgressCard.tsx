import type { Scene, Asset, AssetStatus } from '../../types';

interface AssetProgressCardProps {
  scene: Scene;
  index: number;
  assets: { image?: Asset; audio?: Asset };
  onRetry: (assetId: string) => void;
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const styles: Record<AssetStatus, string> = {
    pending: 'bg-gray-200 text-gray-700',
    generating: 'bg-blue-200 text-blue-700 animate-pulse',
    complete: 'bg-green-200 text-green-700',
    failed: 'bg-red-200 text-red-700',
  };

  const labels: Record<AssetStatus, string> = {
    pending: 'Pending',
    generating: 'Generating',
    complete: 'Complete',
    failed: 'Failed',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function RetryButton({
  assetId,
  onRetry,
  isRetrying,
}: {
  assetId: string;
  onRetry: (id: string) => void;
  isRetrying: boolean;
}) {
  return (
    <button
      onClick={() => onRetry(assetId)}
      disabled={isRetrying}
      className="ml-2 text-blue-600 hover:underline disabled:opacity-50 text-sm"
    >
      {isRetrying ? 'Retrying...' : 'Retry'}
    </button>
  );
}

export function AssetProgressCard({ scene, index, assets, onRetry }: AssetProgressCardProps) {
  const { image, audio } = assets;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900">Scene {index + 1}</h3>
          <p className="text-sm text-gray-500 truncate">
            {scene.script.slice(0, 80)}
            {scene.script.length > 80 ? '...' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Image status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Image</span>
            {image && <StatusBadge status={image.status} />}
          </div>
          {image?.status === 'complete' && image.dataUrl && (
            <img
              src={image.dataUrl}
              alt={`Scene ${index + 1}`}
              className="w-full h-32 object-cover rounded border"
            />
          )}
          {image?.status === 'generating' && (
            <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          {image?.status === 'pending' && (
            <div className="w-full h-32 bg-gray-50 rounded border flex items-center justify-center">
              <span className="text-gray-400 text-sm">Waiting...</span>
            </div>
          )}
          {image?.status === 'failed' && (
            <div className="w-full h-32 bg-red-50 rounded border flex flex-col items-center justify-center p-2">
              <span className="text-red-600 text-xs text-center mb-2">
                {image.error || 'Generation failed'}
              </span>
              <RetryButton assetId={image.id} onRetry={onRetry} isRetrying={false} />
            </div>
          )}
        </div>

        {/* Audio status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Audio</span>
            {audio && <StatusBadge status={audio.status} />}
          </div>
          {audio?.status === 'complete' && (
            <div className="w-full h-32 bg-green-50 rounded border flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">🔊</span>
              <span className="text-sm text-gray-600">
                {audio.duration ? `${audio.duration.toFixed(1)}s` : 'Ready'}
              </span>
              {audio.dataUrl && (
                <audio src={audio.dataUrl} controls className="w-full mt-2 h-8" />
              )}
            </div>
          )}
          {audio?.status === 'generating' && (
            <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          {audio?.status === 'pending' && (
            <div className="w-full h-32 bg-gray-50 rounded border flex items-center justify-center">
              <span className="text-gray-400 text-sm">Waiting...</span>
            </div>
          )}
          {audio?.status === 'failed' && (
            <div className="w-full h-32 bg-red-50 rounded border flex flex-col items-center justify-center p-2">
              <span className="text-red-600 text-xs text-center mb-2">
                {audio.error || 'Generation failed'}
              </span>
              <RetryButton assetId={audio.id} onRetry={onRetry} isRetrying={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
