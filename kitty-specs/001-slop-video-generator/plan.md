# Implementation Plan: Slop Video Generator Web UI
*Path: [kitty-specs/001-slop-video-generator/plan.md](kitty-specs/001-slop-video-generator/plan.md)*

**Branch**: `001-slop-video-generator` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/kitty-specs/001-slop-video-generator/spec.md`

## Summary

A React web application (Vite + Tailwind) that provides a UI for the oskarissimus/slop video generation pipeline. The frontend makes direct API calls to OpenAI, DeepSeek, and ElevenLabs from the browser, with only FFmpeg video assembly handled by a Cloud Run backend. The multi-stage workflow covers: configuration, streaming LLM scene generation, parallel asset generation with progress tracking, video assembly, and playback/download.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (dev only)
**Primary Dependencies**: React 18, Vite 5, Tailwind CSS 3, native Fetch API
**Storage**: Browser session storage (API keys), in-memory state (React Context)
**Testing**: Vitest + React Testing Library (frontend), pytest (backend)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions), Cloud Run (backend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: First scene visible within 5s of LLM response start, video assembly < 2 min for 18 scenes
**Constraints**: API keys never leave browser, no server-side storage, static hosting on GitHub Pages
**Scale/Scope**: Single user at a time on frontend, Cloud Run scales backend independently

## Engineering Alignment (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Vite + React | Static SPA, no SSR needed, fast dev server |
| State Management | React Context + useState | Simple workflow, no external dependencies |
| LLM Streaming | Native fetch + ReadableStream | Direct browser support for OpenAI streaming format |
| API Architecture | Client-side direct calls | LLM, images, TTS all from browser - simpler, no proxy needed |
| Backend Scope | FFmpeg only | Single Cloud Run endpoint for video assembly |
| Styling | Tailwind CSS | Fast prototyping, minimal overhead |
| Deployment | GitHub Pages (frontend) + Cloud Run (backend) | Static hosting + serverless compute |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template has not been customized for this project. Applying general best practices:

- [x] **Simplicity**: Minimal dependencies (React, Vite, Tailwind only)
- [x] **Testability**: Components isolated, services can be mocked
- [x] **Security**: API keys in session only, never sent to backend
- [x] **Observability**: Error logging to Google Cloud Logging from backend

No constitution violations identified.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Vite + React on GitHub Pages)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ React Context                                          │ │
│  │ ├── ConfigContext (API keys, settings)                │ │
│  │ ├── SceneContext (generated scenes, edits)            │ │
│  │ ├── AssetContext (images, audio, progress)            │ │
│  │ └── WorkflowContext (current stage, status)           │ │
│  └───────────────────────────────────────────────────────┘ │
│           │              │              │                   │
│           ▼              ▼              ▼                   │
│     OpenAI API    ElevenLabs API   DeepSeek API            │
│   (streaming LLM    (TTS audio)    (alt LLM                │
│    + images)                        streaming)             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ POST /assemble-video
                           │ (multipart: images + audio files)
                           ▼
              ┌─────────────────────────┐
              │  Cloud Run (Python)     │
              │  ┌───────────────────┐  │
              │  │ FFmpeg Assembly   │  │
              │  │ - images → video  │  │
              │  │ - concat audio    │  │
              │  │ - merge tracks    │  │
              │  └───────────────────┘  │
              └─────────────────────────┘
                           │
                           ▼
                    Video file (MP4)
                    Download/Play in browser
```

## Project Structure

### Documentation (this feature)

```
kitty-specs/001-slop-video-generator/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output - API research
├── data-model.md        # Phase 1 output - entities & state
├── quickstart.md        # Phase 1 output - dev setup guide
├── contracts/           # Phase 1 output - API contracts
│   └── video-assembly.yaml  # OpenAPI spec for backend
└── tasks.md             # Phase 2 output (created by /spec-kitty.tasks)
```

### Source Code (repository root)

```
frontend/
├── src/
│   ├── components/
│   │   ├── config/          # API key inputs, settings forms
│   │   ├── scenes/          # Scene cards, editor, streaming display
│   │   ├── assets/          # Progress indicators, retry buttons
│   │   ├── video/           # Video player, download button
│   │   └── ui/              # Shared UI components (buttons, inputs)
│   ├── contexts/
│   │   ├── ConfigContext.tsx
│   │   ├── SceneContext.tsx
│   │   ├── AssetContext.tsx
│   │   └── WorkflowContext.tsx
│   ├── services/
│   │   ├── llm.ts           # OpenAI/DeepSeek streaming client
│   │   ├── images.ts        # Image generation + brightness correction
│   │   ├── tts.ts           # ElevenLabs TTS with context
│   │   └── video.ts         # Backend video assembly client
│   ├── hooks/
│   │   ├── useStreaming.ts  # ReadableStream parsing
│   │   └── useAssetGeneration.ts  # Parallel generation orchestration
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            # Tailwind imports
├── public/
├── tests/
│   ├── components/
│   ├── services/
│   └── hooks/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json

backend/
├── src/
│   ├── main.py              # FastAPI app entry
│   ├── routes/
│   │   └── assemble.py      # POST /assemble-video
│   ├── services/
│   │   └── ffmpeg.py        # FFmpeg video assembly logic
│   └── models/
│       └── requests.py      # Pydantic models
├── tests/
│   └── test_assemble.py
├── Dockerfile
├── requirements.txt
└── cloudbuild.yaml

.github/
└── workflows/
    ├── deploy-frontend.yml   # GitHub Pages deployment
    └── deploy-backend.yml    # Cloud Run deployment
```

**Structure Decision**: Web application structure with separate `frontend/` and `backend/` directories. Frontend is a Vite React SPA deployed to GitHub Pages. Backend is a minimal Python FastAPI service for FFmpeg video assembly deployed to Cloud Run.

## Workflow Stages

### Stage 1: Configuration
- User enters API keys (OpenAI, DeepSeek, ElevenLabs)
- Keys validated via lightweight API call
- User configures video settings (resolution, scenes, TTS voice, etc.)
- Settings stored in ConfigContext

### Stage 2: Scene Generation
- User enters creative prompt
- System calls selected LLM with streaming enabled
- Scenes parsed progressively and displayed as they arrive
- User can edit script/image_description per scene
- User can add/remove scenes

### Stage 3: Asset Generation
- System generates images (max 12 concurrent)
- System generates audio (max 4 concurrent)
- Progress displayed per asset (pending/generating/complete/failed)
- Failed assets show retry button
- Auto-brightness correction for dark images

### Stage 4: Video Assembly
- All assets sent to Cloud Run backend
- Backend uses FFmpeg to:
  1. Create silent video from images with durations
  2. Concatenate audio files
  3. Merge video + audio tracks
- Progress indicator shown during assembly

### Stage 5: Output
- Video displayed in embedded player
- Download button available
- Appropriate filename generated

## Complexity Tracking

No complexity violations. Architecture is minimal:
- 2 deployable units (frontend static site, backend Cloud Run)
- No databases
- No authentication system (user provides own API keys)
- Simple React Context state (no Redux, MobX, etc.)

## Next Steps

1. **Phase 0**: Research API specifics (OpenAI streaming format, ElevenLabs context params, image brightness detection)
2. **Phase 1**: Generate data-model.md, contracts/video-assembly.yaml, quickstart.md
3. **Phase 2**: Generate tasks.md with work packages
