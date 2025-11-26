---
work_package_id: "WP03"
subtasks:
  - "T013"
  - "T014"
  - "T015"
  - "T016"
  - "T017"
  - "T018"
  - "T019"
title: "Configuration UI - User Story 2 & 3"
phase: "Phase 1 - Core Features"
lane: "done"
assignee: "claude"
agent: "claude-reviewer"
shell_pid: "$$"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP03-configuration-ui.md](kitty-specs/001-slop-video-generator/tasks/planned/WP03-configuration-ui.md)*

# Work Package Prompt: WP03 – Configuration UI - User Story 2 & 3

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- Configuration screen renders with all input fields
- User can enter and validate API keys (OpenAI, ElevenLabs, optional DeepSeek)
- User can select LLM provider and model with context limits displayed
- User can configure video settings (resolution, fps, scenes, duration)
- User can configure TTS settings (voice, speed, model)
- "Start Generation" button enabled only when required fields valid
- Values persist in ConfigContext

**Acceptance Criteria (from spec.md)**:
- US2: Default values display on load; changes stored and used during generation
- US3: Provider dropdown shows OpenAI/DeepSeek; model dropdown filtered by provider

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/spec.md` - User Stories 2 & 3, FR-001 to FR-008
  - `kitty-specs/001-slop-video-generator/data-model.md` - ConfigState interface
- **Dependencies**: WP02 (ConfigContext) must be complete
- **Styling**: Tailwind CSS utility classes
- **Validation**: API keys validated before allowing progression (FR-002)

## Subtasks & Detailed Guidance

### Subtask T013 – Create ConfigScreen component shell

- **Purpose**: Container component for configuration stage
- **Steps**:
  1. Create `frontend/src/components/config/ConfigScreen.tsx`
  2. Structure with sections: API Keys, LLM Settings, Video Settings, TTS Settings
  3. Add heading and section dividers
  4. Import useConfig and useWorkflow hooks
  5. Render child components (to be created)
  ```tsx
  export function ConfigScreen() {
    const { stage } = useWorkflow();
    if (stage !== 'config') return null;

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold">Configuration</h1>
        <section>
          <h2 className="text-xl font-semibold mb-4">API Keys</h2>
          <ApiKeyInputs />
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">LLM Settings</h2>
          <LlmProviderSelect />
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">Video Settings</h2>
          <VideoSettings />
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">TTS Settings</h2>
          <TtsSettings />
        </section>
        {/* Start button will be added in T019 */}
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/config/ConfigScreen.tsx`, `frontend/src/components/config/index.ts`
- **Parallel?**: No (shell required before children)

### Subtask T014 – Build ApiKeyInputs component

- **Purpose**: Input fields for API keys with show/hide toggle (FR-001, FR-002, FR-003)
- **Steps**:
  1. Create `frontend/src/components/config/ApiKeyInputs.tsx`
  2. Three input fields: OpenAI (required), DeepSeek (optional), ElevenLabs (required)
  3. Password input type with eye icon toggle to show/hide
  4. Validation status indicator (pending/valid/invalid)
  5. Connect to ConfigContext.updateApiKeys
  ```tsx
  interface ApiKeyFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    validationStatus?: 'pending' | 'valid' | 'invalid';
  }

  function ApiKeyField({ label, value, onChange, required, validationStatus }: ApiKeyFieldProps) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md pr-10"
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
        {validationStatus === 'invalid' && (
          <p className="text-sm text-red-500">Invalid API key</p>
        )}
      </div>
    );
  }
  ```
- **Files**: `frontend/src/components/config/ApiKeyInputs.tsx`
- **Parallel?**: Yes (after T013)
- **Notes**: Keys stored in memory only, never persisted (FR-003)

### Subtask T015 – Build LlmProviderSelect component

- **Purpose**: Provider dropdown and model selection with metadata (FR-004, FR-005, FR-006)
- **Steps**:
  1. Create `frontend/src/components/config/LlmProviderSelect.tsx`
  2. Provider dropdown: OpenAI, DeepSeek
  3. Model dropdown filtered by provider:
     - OpenAI: gpt-4o (128k), gpt-4o-mini (128k), gpt-4-turbo (128k)
     - DeepSeek: deepseek-chat (64k), deepseek-coder (64k)
  4. Display context window and pricing info
  5. Connect to ConfigContext.updateLlm
  ```tsx
  const MODELS = {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', context: '128k', pricing: '$5/$15 per 1M' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128k', pricing: '$0.15/$0.60 per 1M' },
    ],
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', context: '64k', pricing: '$0.14/$0.28 per 1M' },
    ],
  };
  ```
- **Files**: `frontend/src/components/config/LlmProviderSelect.tsx`
- **Parallel?**: Yes (after T013)
- **Notes**: DeepSeek requires DeepSeek API key to be set

### Subtask T016 – Build VideoSettings component

- **Purpose**: Configure video parameters (FR-008 defaults)
- **Steps**:
  1. Create `frontend/src/components/config/VideoSettings.tsx`
  2. Fields with defaults from FR-008:
     - Resolution: dropdown with presets (1024x1536, 1920x1080, 1080x1920)
     - Frame rate: number input (default 24)
     - Number of scenes: number input (default 18)
     - Target duration: number input in seconds (default 180)
     - Image model: dropdown (gpt-image-1)
     - Image quality: dropdown (low, medium, high)
     - Temperature: slider 0-1 (default 0.7)
  3. Connect to ConfigContext.updateVideo, updateImage, updateTemperature
  ```tsx
  const RESOLUTIONS = [
    { label: '1024x1536 (Portrait)', width: 1024, height: 1536 },
    { label: '1920x1080 (Landscape)', width: 1920, height: 1080 },
    { label: '1080x1920 (Portrait HD)', width: 1080, height: 1920 },
  ];
  ```
- **Files**: `frontend/src/components/config/VideoSettings.tsx`
- **Parallel?**: Yes (after T013)

### Subtask T017 – Build TtsSettings component

- **Purpose**: Configure TTS parameters (FR-008 defaults)
- **Steps**:
  1. Create `frontend/src/components/config/TtsSettings.tsx`
  2. Fields with defaults from FR-008:
     - TTS model: text (eleven_multilingual_v2)
     - Voice ID: text input with preset suggestions (default Bx2lBwIZJBilRBVc3AGO)
     - Speed: slider 0.5-2.0 (default 1.1)
     - Concurrency: number input 1-10 (default 4)
  3. Connect to ConfigContext.updateTts
- **Files**: `frontend/src/components/config/TtsSettings.tsx`
- **Parallel?**: Yes (after T013)
- **Notes**: Could add voice preview button as enhancement

### Subtask T018 – Implement API key validation service

- **Purpose**: Validate API keys with lightweight API calls (FR-002)
- **Steps**:
  1. Create `frontend/src/services/validation.ts`
  2. Implement validateOpenAiKey: call /v1/models with key
  3. Implement validateElevenLabsKey: call /v1/user with key
  4. Implement validateDeepSeekKey: call /v1/models with key
  5. Return validation result with error message if invalid
  ```typescript
  export async function validateOpenAiKey(apiKey: string): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) return { valid: true };
      const error = await response.json();
      return { valid: false, error: error.error?.message || 'Invalid API key' };
    } catch {
      return { valid: false, error: 'Network error' };
    }
  }
  ```
- **Files**: `frontend/src/services/validation.ts`
- **Parallel?**: No (required for T019)

### Subtask T019 – Add "Start Generation" button with stage transition

- **Purpose**: Allow progression from config to scene generation stage
- **Steps**:
  1. Add button to ConfigScreen below all settings
  2. Button disabled unless:
     - OpenAI API key valid OR DeepSeek API key valid (based on selected provider)
     - ElevenLabs API key valid
  3. On click: call validation, if success set stage to 'scenes'
  4. Show loading state during validation
  ```tsx
  const [isValidating, setIsValidating] = useState(false);

  const handleStartGeneration = async () => {
    setIsValidating(true);
    const { llm, apiKeys } = config;

    // Validate selected provider key
    const llmValid = llm.provider === 'openai'
      ? await validateOpenAiKey(apiKeys.openai)
      : await validateDeepSeekKey(apiKeys.deepseek || '');

    const ttsValid = await validateElevenLabsKey(apiKeys.elevenLabs);

    if (llmValid.valid && ttsValid.valid) {
      setStage('scenes');
    } else {
      setError(llmValid.error || ttsValid.error || 'Validation failed');
    }
    setIsValidating(false);
  };
  ```
- **Files**: `frontend/src/components/config/ConfigScreen.tsx`
- **Parallel?**: No (final step)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API validation slow | Show loading spinner, consider caching valid status |
| Invalid key unclear UX | Show specific error from API response |
| Form state complex | Keep simple with individual change handlers |

## Definition of Done Checklist

- [ ] ConfigScreen renders with all sections
- [ ] API key inputs with show/hide toggle work
- [ ] LLM provider selection filters model dropdown
- [ ] Model metadata (context, pricing) displays
- [ ] Video settings editable with correct defaults
- [ ] TTS settings editable with correct defaults
- [ ] API key validation works for OpenAI and ElevenLabs
- [ ] Start Generation button validates and transitions stage
- [ ] All values persist in ConfigContext
- [ ] `tasks.md` updated with WP03 completion

## Review Guidance

- Verify default values match FR-008 exactly
- Test provider switch updates model dropdown
- Confirm validation errors display clearly
- Check stage transition works after valid keys

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T13:30:04Z – claude – shell_pid=21291 – lane=doing – Started implementation of Configuration UI
- 2025-11-26T13:33:13Z – claude – shell_pid=23609 – lane=for_review – Completed implementation - Configuration UI with all components and validation, lint/typecheck pass
- 2025-11-26T14:51:06Z – claude-reviewer – shell_pid=$$ – lane=done – Code review approved: All config components with validation, proper stage transition
