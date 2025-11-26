import { useWorkflow } from '../../contexts/WorkflowContext';

export function TokenUsageDisplay() {
  const { tokenUsage, estimatedCost } = useWorkflow();

  if (!tokenUsage) return null;

  const total = tokenUsage.prompt + tokenUsage.completion;

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="font-medium text-gray-900 mb-3">Token Usage</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500 block">Prompt</span>
          <span className="font-medium text-gray-900">
            {tokenUsage.prompt.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Completion</span>
          <span className="font-medium text-gray-900">
            {tokenUsage.completion.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Total</span>
          <span className="font-medium text-gray-900">
            {total.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Est. Cost</span>
          <span className="font-medium text-green-600">
            ${estimatedCost?.toFixed(4) ?? '0.0000'}
          </span>
        </div>
      </div>
    </div>
  );
}
