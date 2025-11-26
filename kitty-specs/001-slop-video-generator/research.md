# Research Decision Log

Document the outcomes of Phase 0 discovery work for Slop Video Generator.

## Summary

- **Feature**: 001-slop-video-generator
- **Date**: 2025-11-26
- **Researchers**: Claude (AI), User
- **Open Questions**: None - all technical decisions confirmed

## Decisions & Rationale

| Decision | Rationale | Evidence | Status |
|----------|-----------|----------|--------|
| Client-side API calls for LLM/images/TTS | Simpler architecture, no proxy overhead, user controls their own keys | User confirmation during planning | final |
| Backend only for FFmpeg | Video assembly requires FFmpeg binary not available in browser | User confirmation during planning | final |
| Vite + React (not Next.js) | Static export only, no SSR needed, faster dev experience | User confirmation during planning | final |
| React Context + useState | Simple workflow state, no external state library overhead | User confirmation during planning | final |
| Native fetch + ReadableStream | Browser-native streaming support, no library needed | OpenAI API docs | final |
| Tailwind CSS | Fast prototyping, user preference for simplicity | User confirmation during planning | final |

## API Research Findings

### OpenAI Chat Completions (Streaming)

**Endpoint**: `POST https://api.openai.com/v1/chat/completions`

**Streaming format**: Server-Sent Events (SSE)
- Set `stream: true` in request body
- Response is `text/event-stream`
- Each chunk: `data: {"choices":[{"delta":{"content":"..."}}]}`
- Stream ends with: `data: [DONE]`

**Browser implementation**:
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [...],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE format: "data: {...}\n\n"
}
```

**CORS**: OpenAI API supports CORS for browser requests.

### OpenAI Image Generation

**Endpoint**: `POST https://api.openai.com/v1/images/generations`

**Response format**: Can request `b64_json` or `url`
- `b64_json`: Base64-encoded image data (recommended for browser to avoid CORS on image URLs)
- Images expire after 1 hour if using URL format

**Brightness correction**: The spec mentions auto-correcting dark images. This requires:
1. Drawing image to canvas
2. Calculating average brightness from pixel data
3. Applying CSS filter or canvas manipulation if below threshold

### DeepSeek Chat Completions (Streaming)

**Endpoint**: `POST https://api.deepseek.com/v1/chat/completions`

**Format**: OpenAI-compatible API
- Same streaming format as OpenAI
- Same request/response structure
- Different API key header

**CORS**: Needs verification - may require backend proxy if CORS not supported.

### ElevenLabs Text-to-Speech

**Endpoint**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Context parameters** (for natural transitions):
- `previous_text`: Text from previous scene (provides context)
- `next_text`: Text from next scene (provides context)
- These help the TTS model maintain natural speech flow

**Response**: Audio file (mp3/wav)
- Request `output_format=mp3_44100_128` for good quality/size balance

**Timing data**: The spec mentions timing data for video assembly.
- ElevenLabs provides `alignment` data with word-level timestamps
- Use `with_timestamps: true` in request

**CORS**: ElevenLabs supports CORS for browser requests.

### FFmpeg Video Assembly (Backend)

**Process**:
1. Receive images + audio files via multipart form
2. Calculate duration per image from audio timestamps
3. Create image sequence video: `ffmpeg -loop 1 -t {duration} -i image.png ...`
4. Concatenate audio files: `ffmpeg -i "concat:audio1.mp3|audio2.mp3" ...`
5. Merge video + audio: `ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac output.mp4`

**Cloud Run considerations**:
- FFmpeg available in most container images
- Memory limit: 2GB should be sufficient for 3-min video
- Timeout: Set to 5 minutes for safety
- Temp storage: Use `/tmp` (mounted as tmpfs)

## Evidence Highlights

- **Key insight 1**: OpenAI streaming uses SSE format, easily parsed with native ReadableStream
- **Key insight 2**: ElevenLabs supports previous/next text context for natural speech transitions
- **Key insight 3**: Image brightness correction can be done client-side with Canvas API
- **Risks / Concerns**: DeepSeek CORS support unconfirmed - may need to test or provide fallback

## Next Actions

1. Proceed to Phase 1: Generate data-model.md with entity definitions
2. Generate contracts/video-assembly.yaml OpenAPI spec
3. Generate quickstart.md developer setup guide
