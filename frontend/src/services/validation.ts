export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateOpenAiKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid OpenAI API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Network error validating API key',
    };
  }
}

export async function validateDeepSeekKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'DeepSeek API key is required' };
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid DeepSeek API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Network error validating API key',
    };
  }
}

export async function validateElevenLabsKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'ElevenLabs API key is required' };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid ElevenLabs API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.detail?.message || error.message || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Network error validating API key',
    };
  }
}
