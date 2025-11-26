---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
title: "Project Setup & Scaffolding"
phase: "Phase 0 - Setup"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "90448"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP01-project-setup.md](kitty-specs/001-slop-video-generator/tasks/planned/WP01-project-setup.md)*

# Work Package Prompt: WP01 – Project Setup & Scaffolding

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- Frontend Vite + React + TypeScript project runs with `npm run dev` on localhost:5173
- Backend FastAPI project runs with `uvicorn src.main:app --reload` on localhost:8000
- Tailwind CSS configured and working with utility classes
- ESLint and TypeScript strict mode enabled
- TypeScript type definitions created matching data-model.md
- Environment configuration files in place

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/plan.md` - Project structure
  - `kitty-specs/001-slop-video-generator/data-model.md` - TypeScript interfaces
  - `kitty-specs/001-slop-video-generator/quickstart.md` - Development setup
- **Stack**: Vite 5, React 18, TypeScript 5.x, Tailwind CSS 3, FastAPI, Python 3.11+
- **Deployment targets**: GitHub Pages (frontend), Cloud Run (backend)

## Subtasks & Detailed Guidance

### Subtask T001 – Initialize frontend with Vite + React + TypeScript

- **Purpose**: Create the frontend project foundation
- **Steps**:
  1. Run `npm create vite@latest frontend -- --template react-ts`
  2. Navigate to `frontend/` and run `npm install`
  3. Verify dev server starts with `npm run dev`
  4. Update `index.html` title to "Slop Video Generator"
- **Files**: `frontend/`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/index.html`
- **Parallel?**: No (must complete first)

### Subtask T002 – Configure Tailwind CSS

- **Purpose**: Enable utility-first CSS styling
- **Steps**:
  1. Install Tailwind: `npm install -D tailwindcss postcss autoprefixer`
  2. Run `npx tailwindcss init -p`
  3. Configure `tailwind.config.js`:
     ```js
     export default {
       content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
       theme: { extend: {} },
       plugins: [],
     }
     ```
  4. Update `frontend/src/index.css`:
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```
  5. Verify Tailwind works by adding a class to App.tsx
- **Files**: `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/src/index.css`
- **Parallel?**: Yes (after T001)

### Subtask T003 – Configure ESLint and TypeScript strict mode

- **Purpose**: Enforce code quality and type safety
- **Steps**:
  1. Update `frontend/tsconfig.json` with strict settings:
     ```json
     {
       "compilerOptions": {
         "strict": true,
         "noUnusedLocals": true,
         "noUnusedParameters": true,
         "noFallthroughCasesInSwitch": true
       }
     }
     ```
  2. Update ESLint config in `frontend/eslint.config.js` for TypeScript
  3. Add npm scripts: `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`
  4. Verify both pass with `npm run lint && npm run typecheck`
- **Files**: `frontend/tsconfig.json`, `frontend/eslint.config.js`, `frontend/package.json`
- **Parallel?**: Yes (after T001)

### Subtask T004 – Initialize Python backend with FastAPI

- **Purpose**: Create the backend API foundation
- **Steps**:
  1. Create `backend/` directory structure:
     ```
     backend/
     ├── src/
     │   ├── __init__.py
     │   ├── main.py
     │   ├── routes/
     │   │   └── __init__.py
     │   ├── services/
     │   │   └── __init__.py
     │   └── models/
     │       └── __init__.py
     └── tests/
         └── __init__.py
     ```
  2. Create `backend/src/main.py`:
     ```python
     from fastapi import FastAPI
     from fastapi.middleware.cors import CORSMiddleware

     app = FastAPI(title="Slop Video Assembly API", version="1.0.0")

     app.add_middleware(
         CORSMiddleware,
         allow_origins=["*"],  # Configure for production
         allow_credentials=True,
         allow_methods=["*"],
         allow_headers=["*"],
     )

     @app.get("/health")
     async def health():
         return {"status": "healthy", "version": "1.0.0"}
     ```
  3. Verify with `uvicorn src.main:app --reload`
- **Files**: `backend/src/main.py`, `backend/src/__init__.py`
- **Parallel?**: Yes (independent of frontend)

### Subtask T005 – Create backend Dockerfile and requirements.txt

- **Purpose**: Enable containerized deployment to Cloud Run
- **Steps**:
  1. Create `backend/requirements.txt`:
     ```
     fastapi>=0.109.0
     uvicorn[standard]>=0.27.0
     python-multipart>=0.0.6
     pydantic>=2.5.0
     ```
  2. Create `backend/Dockerfile`:
     ```dockerfile
     FROM python:3.11-slim

     WORKDIR /app

     # Install FFmpeg
     RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

     COPY requirements.txt .
     RUN pip install --no-cache-dir -r requirements.txt

     COPY src/ ./src/

     CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
     ```
  3. Verify Docker builds: `docker build -t slop-backend .`
- **Files**: `backend/requirements.txt`, `backend/Dockerfile`
- **Parallel?**: Yes (after T004)

### Subtask T006 – Create TypeScript type definitions

- **Purpose**: Define shared types matching data-model.md
- **Steps**:
  1. Create `frontend/src/types/index.ts` with interfaces from data-model.md:
     ```typescript
     // Configuration
     export interface ConfigState {
       apiKeys: {
         openai: string;
         deepseek: string | null;
         elevenLabs: string;
       };
       llm: {
         provider: 'openai' | 'deepseek';
         model: string;
       };
       video: {
         resolution: { width: number; height: number };
         frameRate: number;
         numScenes: number;
         targetDuration: number;
       };
       image: {
         model: string;
         quality: 'low' | 'medium' | 'high';
       };
       tts: {
         model: string;
         voiceId: string;
         speed: number;
         concurrency: number;
       };
       temperature: number;
     }

     // Scene
     export interface Scene {
       id: string;
       index: number;
       script: string;
       imageDescription: string;
       isEdited: boolean;
     }

     export interface SceneState {
       scenes: Scene[];
       isStreaming: boolean;
       streamBuffer: string;
     }

     // Asset
     export type AssetStatus = 'pending' | 'generating' | 'complete' | 'failed';
     export type AssetType = 'image' | 'audio';

     export interface Asset {
       id: string;
       sceneId: string;
       type: AssetType;
       status: AssetStatus;
       data: Blob | null;
       dataUrl: string | null;
       duration: number | null;
       error: string | null;
       retryCount: number;
     }

     export interface AudioTiming {
       assetId: string;
       words: Array<{ word: string; start: number; end: number }>;
       totalDuration: number;
     }

     export interface AssetState {
       assets: Map<string, Asset>;
       timings: Map<string, AudioTiming>;
       generationQueue: string[];
     }

     // Workflow
     export type WorkflowStage = 'config' | 'scenes' | 'assets' | 'assembly' | 'output';

     export interface WorkflowState {
       stage: WorkflowStage;
       isGenerating: boolean;
       error: string | null;
       tokenUsage: { prompt: number; completion: number } | null;
       estimatedCost: number | null;
       finalVideo: Blob | null;
     }
     ```
- **Files**: `frontend/src/types/index.ts`
- **Parallel?**: No (defines shared types for subsequent work)

### Subtask T007 – Create environment configuration files

- **Purpose**: Enable environment-specific configuration
- **Steps**:
  1. Create `frontend/.env.local.example`:
     ```
     VITE_BACKEND_URL=http://localhost:8000
     ```
  2. Create `frontend/.env.local` with same content (gitignored)
  3. Create `backend/.env.example`:
     ```
     GOOGLE_CLOUD_PROJECT=your-project-id
     ```
  4. Update `frontend/.gitignore` to include `.env.local`
  5. Update `backend/.gitignore` to include `.env`
- **Files**: `frontend/.env.local.example`, `frontend/.env.local`, `backend/.env.example`, `.gitignore` files
- **Parallel?**: Yes

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Node.js version mismatch | Document Node 20+ requirement in README |
| Python version mismatch | Document Python 3.11+ requirement in README |
| Docker build fails | Ensure FFmpeg package name correct for Debian-based image |

## Definition of Done Checklist

- [ ] Frontend dev server starts and shows React app
- [ ] Tailwind utility classes render correctly
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] Backend dev server starts and /health returns 200
- [ ] Docker image builds successfully
- [ ] Type definitions match data-model.md
- [ ] Environment files in place
- [ ] `tasks.md` updated with WP01 completion

## Review Guidance

- Verify all file paths match plan.md structure
- Check TypeScript types match data-model.md exactly
- Confirm dev servers start without errors
- Verify Tailwind class works in a test component

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T12:55:49Z – claude – shell_pid=90448 – lane=doing – Started implementation
