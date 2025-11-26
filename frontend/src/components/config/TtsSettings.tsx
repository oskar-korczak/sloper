import { useConfig } from '../../contexts/ConfigContext';

const TTS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2' },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1' },
];

const VOICE_PRESETS = [
  { id: 'Bx2lBwIZJBilRBVc3AGO', name: 'Daniel (Default)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
];

export function TtsSettings() {
  const { config, updateTts } = useConfig();
  const { tts } = config;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            TTS Model
          </label>
          <select
            value={tts.model}
            onChange={(e) => updateTts({ model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TTS_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Voice
          </label>
          <select
            value={tts.voiceId}
            onChange={(e) => updateTts({ voiceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {VOICE_PRESETS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Custom Voice ID (optional)
        </label>
        <input
          type="text"
          value={tts.voiceId}
          onChange={(e) => updateTts({ voiceId: e.target.value })}
          placeholder="Enter custom voice ID"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">
          Override the preset with a custom ElevenLabs voice ID
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Speed: {tts.speed.toFixed(1)}x
        </label>
        <input
          type="range"
          value={tts.speed}
          onChange={(e) => updateTts({ speed: parseFloat(e.target.value) })}
          min={0.5}
          max={2.0}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Slow (0.5x)</span>
          <span>Fast (2.0x)</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Concurrency: {tts.concurrency} parallel requests
        </label>
        <input
          type="range"
          value={tts.concurrency}
          onChange={(e) => updateTts({ concurrency: parseInt(e.target.value) })}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1 (slower, safer)</span>
          <span>10 (faster, may hit rate limits)</span>
        </div>
      </div>
    </div>
  );
}
