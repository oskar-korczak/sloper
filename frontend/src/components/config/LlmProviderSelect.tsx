import { useConfig } from '../../contexts/ConfigContext';

interface ModelInfo {
  id: string;
  name: string;
  context: string;
  pricing: string;
}

const MODELS: Record<'openai' | 'deepseek', ModelInfo[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', context: '128k', pricing: '$5/$15 per 1M tokens' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128k', pricing: '$0.15/$0.60 per 1M tokens' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: '128k', pricing: '$10/$30 per 1M tokens' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', context: '64k', pricing: '$0.14/$0.28 per 1M tokens' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', context: '64k', pricing: '$0.14/$0.28 per 1M tokens' },
  ],
};

export function LlmProviderSelect() {
  const { config, updateLlm } = useConfig();
  const { provider, model } = config.llm;
  const models = MODELS[provider];
  const selectedModel = models.find((m) => m.id === model) || models[0];

  const handleProviderChange = (newProvider: 'openai' | 'deepseek') => {
    // When provider changes, select first model for that provider
    const defaultModel = MODELS[newProvider][0].id;
    updateLlm({ provider: newProvider, model: defaultModel });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          LLM Provider
        </label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'deepseek')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
        </select>
        {provider === 'deepseek' && !config.apiKeys.deepseek && (
          <p className="text-sm text-amber-600">
            DeepSeek API key required for this provider
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => updateLlm({ model: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-gray-50 p-3 rounded-md text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Context Window:</span>
          <span className="font-medium">{selectedModel.context}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Pricing (input/output):</span>
          <span className="font-medium">{selectedModel.pricing}</span>
        </div>
      </div>
    </div>
  );
}
