import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';

interface ApiKeyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

function ApiKeyField({ label, value, onChange, required, placeholder }: ApiKeyFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export function ApiKeyInputs() {
  const { config, updateApiKeys } = useConfig();

  return (
    <div className="space-y-4">
      <ApiKeyField
        label="OpenAI API Key"
        value={config.apiKeys.openai}
        onChange={(value) => updateApiKeys({ openai: value })}
        required
        placeholder="sk-..."
      />
      <ApiKeyField
        label="DeepSeek API Key"
        value={config.apiKeys.deepseek || ''}
        onChange={(value) => updateApiKeys({ deepseek: value || null })}
        placeholder="sk-... (optional, for DeepSeek LLM)"
      />
      <ApiKeyField
        label="ElevenLabs API Key"
        value={config.apiKeys.elevenLabs}
        onChange={(value) => updateApiKeys({ elevenLabs: value })}
        required
        placeholder="Your ElevenLabs API key"
      />
      <p className="text-xs text-gray-500">
        API keys are stored in memory only and never persisted.
      </p>
    </div>
  );
}
