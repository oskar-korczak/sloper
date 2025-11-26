interface OverallProgressProps {
  total: number;
  completed: number;
  failed: number;
  isGenerating: boolean;
}

export function OverallProgress({ total, completed, failed, isGenerating }: OverallProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pending = total - completed - failed;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            Progress: {completed} of {total} assets
          </span>
          {isGenerating && (
            <svg
              className="animate-spin h-4 w-4 text-blue-500"
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
          )}
        </div>
        <span className="text-lg font-bold text-gray-900">{percentage}%</span>
      </div>

      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex gap-6 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-700">{completed} complete</span>
        </span>
        {failed > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-red-700">{failed} failed</span>
          </span>
        )}
        {pending > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-gray-600">{pending} pending</span>
          </span>
        )}
      </div>
    </div>
  );
}
