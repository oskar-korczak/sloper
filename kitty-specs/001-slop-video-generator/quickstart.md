# Quickstart: Slop Video Generator

Development setup guide for the Slop Video Generator web application.

## Prerequisites

- **Node.js** 20+ (for frontend development)
- **Python** 3.11+ (for backend development)
- **FFmpeg** (for local backend testing)
- **Docker** (optional, for backend container testing)

### API Keys (for testing)

You'll need API keys from:
- **OpenAI**: https://platform.openai.com/api-keys
- **ElevenLabs**: https://elevenlabs.io/app/settings/api-keys
- **DeepSeek** (optional): https://platform.deepseek.com/

## Project Setup

### 1. Clone and Navigate

```bash
cd /Users/oskar/projects/sloper/.worktrees/001-slop-video-generator
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### 3. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start dev server
uvicorn src.main:app --reload --port 8000

# API available at http://localhost:8000
```

### 4. Environment Variables

Create `.env` files (not committed to git):

**frontend/.env.local**:
```
VITE_BACKEND_URL=http://localhost:8000
```

**backend/.env**:
```
# For Google Cloud Logging (optional in dev)
GOOGLE_CLOUD_PROJECT=your-project-id
```

## Development Workflow

### Frontend Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run Vitest tests
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

### Backend Commands

```bash
uvicorn src.main:app --reload    # Start with auto-reload
pytest                           # Run tests
pytest --cov=src                 # Run with coverage
```

## Architecture Overview

```
frontend/           # Vite + React + Tailwind
├── src/
│   ├── components/  # React components by feature
│   ├── contexts/    # React Context providers
│   ├── services/    # API client functions
│   ├── hooks/       # Custom React hooks
│   └── types/       # TypeScript interfaces

backend/            # FastAPI + FFmpeg
├── src/
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic (FFmpeg)
│   └── models/      # Pydantic schemas
```

## Testing API Integrations

### Test OpenAI Streaming

```typescript
// In browser console or test file
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say hello' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
// Should see streaming chunks
```

### Test ElevenLabs TTS

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/Bx2lBwIZJBilRBVc3AGO" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "model_id": "eleven_multilingual_v2"}' \
  --output test.mp3
```

### Test Backend Locally

```bash
# Health check
curl http://localhost:8000/health

# Test video assembly (with sample files)
curl -X POST http://localhost:8000/assemble-video \
  -F "metadata={\"scenes\":[{\"index\":0,\"imageDuration\":5}],\"resolution\":{\"width\":1024,\"height\":1536},\"frameRate\":24}" \
  -F "images=@test_image.png" \
  -F "audio=@test_audio.mp3" \
  --output test_video.mp4
```

## Deployment

### Frontend to GitHub Pages

1. Push to `001-slop-video-generator` branch
2. GitHub Actions builds and deploys to Pages
3. Access at `https://{username}.github.io/{repo}/`

### Backend to Cloud Run

```bash
# Build and push container
gcloud builds submit --tag gcr.io/{PROJECT}/slop-video-backend

# Deploy
gcloud run deploy slop-video-backend \
  --image gcr.io/{PROJECT}/slop-video-backend \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --timeout 300 \
  --allow-unauthenticated
```

## Troubleshooting

### CORS Errors

- OpenAI and ElevenLabs support CORS for browser requests
- DeepSeek may not - test and add backend proxy if needed
- Backend must include CORS headers for frontend requests

### Streaming Not Working

- Ensure `stream: true` in request body
- Check that response is being read with `ReadableStream`
- Verify API key has streaming permissions

### FFmpeg Errors

- Ensure FFmpeg is installed: `ffmpeg -version`
- Check temp directory has write permissions
- Verify input files are valid images/audio

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/App.tsx` | Main app component with workflow stages |
| `frontend/src/contexts/` | React Context state management |
| `frontend/src/services/llm.ts` | OpenAI/DeepSeek streaming client |
| `frontend/src/services/tts.ts` | ElevenLabs TTS client |
| `backend/src/routes/assemble.py` | Video assembly endpoint |
| `backend/src/services/ffmpeg.py` | FFmpeg video processing |
