---
work_package_id: "WP11"
subtasks:
  - "T069"
  - "T070"
  - "T071"
  - "T072"
  - "T073"
  - "T074"
title: "CI/CD Deployment Workflows"
phase: "Phase 2 - Deployment"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "96350"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.analyze remediation"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP11-deployment-workflows.md](kitty-specs/001-slop-video-generator/tasks/planned/WP11-deployment-workflows.md)*

# Work Package Prompt: WP11 – CI/CD Deployment Workflows

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- GitHub Actions workflow deploys frontend to GitHub Pages on push to main
- GitHub Actions workflow deploys backend to Cloud Run on push to main
- Frontend production build uses correct backend URL
- Deployment process documented for maintainers

**Requirements Coverage**:
- FR-040: Frontend MUST be deployable to GitHub Pages via GitHub Actions
- FR-041: Backend video assembly service MUST be deployable to Google Cloud Run

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/plan.md` - Deployment targets
  - `kitty-specs/001-slop-video-generator/quickstart.md` - Manual deployment steps
- **Dependencies**: WP01 (project structure), WP08 (backend Dockerfile)
- **Secrets required**: GCP service account key, GCP project ID
- **Cloud Run config**: 2GB memory, 300s timeout, allow unauthenticated

## Subtasks & Detailed Guidance

### Subtask T069 – Create frontend deployment workflow

- **Purpose**: Automate frontend deployment to GitHub Pages (FR-040)
- **Steps**:
  1. Create `.github/workflows/deploy-frontend.yml`
  2. Trigger on push to main branch, changes in `frontend/` directory
  3. Build with production environment variables
  4. Deploy to GitHub Pages
  ```yaml
  name: Deploy Frontend

  on:
    push:
      branches: [main]
      paths:
        - 'frontend/**'
        - '.github/workflows/deploy-frontend.yml'
    workflow_dispatch:

  permissions:
    contents: read
    pages: write
    id-token: write

  concurrency:
    group: "pages"
    cancel-in-progress: false

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
            cache-dependency-path: frontend/package-lock.json

        - name: Install dependencies
          working-directory: frontend
          run: npm ci

        - name: Build
          working-directory: frontend
          env:
            VITE_BACKEND_URL: ${{ vars.BACKEND_URL }}
          run: npm run build

        - name: Setup Pages
          uses: actions/configure-pages@v4

        - name: Upload artifact
          uses: actions/upload-pages-artifact@v3
          with:
            path: frontend/dist

    deploy:
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      runs-on: ubuntu-latest
      needs: build
      steps:
        - name: Deploy to GitHub Pages
          id: deployment
          uses: actions/deploy-pages@v4
  ```
- **Files**: `.github/workflows/deploy-frontend.yml`
- **Parallel?**: No (foundation for frontend deployment)

### Subtask T070 – Create backend deployment workflow

- **Purpose**: Automate backend deployment to Cloud Run (FR-041)
- **Steps**:
  1. Create `.github/workflows/deploy-backend.yml`
  2. Trigger on push to main branch, changes in `backend/` directory
  3. Build Docker image and push to Google Container Registry
  4. Deploy to Cloud Run
  ```yaml
  name: Deploy Backend

  on:
    push:
      branches: [main]
      paths:
        - 'backend/**'
        - '.github/workflows/deploy-backend.yml'
    workflow_dispatch:

  env:
    PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    SERVICE_NAME: slop-video-backend
    REGION: us-central1

  jobs:
    deploy:
      runs-on: ubuntu-latest
      permissions:
        contents: read
        id-token: write

      steps:
        - uses: actions/checkout@v4

        - name: Authenticate to Google Cloud
          uses: google-github-actions/auth@v2
          with:
            credentials_json: ${{ secrets.GCP_SA_KEY }}

        - name: Set up Cloud SDK
          uses: google-github-actions/setup-gcloud@v2

        - name: Configure Docker
          run: gcloud auth configure-docker

        - name: Build and push Docker image
          working-directory: backend
          run: |
            docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }} .
            docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }}

        - name: Deploy to Cloud Run
          run: |
            gcloud run deploy $SERVICE_NAME \
              --image gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }} \
              --platform managed \
              --region $REGION \
              --memory 2Gi \
              --timeout 300 \
              --allow-unauthenticated
  ```
- **Files**: `.github/workflows/deploy-backend.yml`
- **Parallel?**: Yes (independent of frontend)

### Subtask T071 – Configure GitHub Pages settings

- **Purpose**: Enable GitHub Pages for the repository
- **Steps**:
  1. Document required GitHub repository settings:
     - Settings → Pages → Source: GitHub Actions
  2. Add base path configuration if repo is not at root domain
  3. Update `frontend/vite.config.ts` with base path if needed:
     ```typescript
     export default defineConfig({
       base: process.env.VITE_BASE_PATH || '/',
       // ... other config
     });
     ```
  4. Handle SPA routing (create 404.html that redirects to index.html)
- **Files**: `frontend/vite.config.ts`, `frontend/public/404.html` (if needed)
- **Parallel?**: No (depends on T069)

### Subtask T072 – Create Cloud Build configuration

- **Purpose**: Alternative deployment via Cloud Build (for manual triggers)
- **Steps**:
  1. Create `backend/cloudbuild.yaml`
  ```yaml
  steps:
    # Build the container image
    - name: 'gcr.io/cloud-builders/docker'
      args: ['build', '-t', 'gcr.io/$PROJECT_ID/slop-video-backend:$COMMIT_SHA', '.']
      dir: 'backend'

    # Push the container image to Container Registry
    - name: 'gcr.io/cloud-builders/docker'
      args: ['push', 'gcr.io/$PROJECT_ID/slop-video-backend:$COMMIT_SHA']

    # Deploy container image to Cloud Run
    - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
      entrypoint: gcloud
      args:
        - 'run'
        - 'deploy'
        - 'slop-video-backend'
        - '--image'
        - 'gcr.io/$PROJECT_ID/slop-video-backend:$COMMIT_SHA'
        - '--region'
        - 'us-central1'
        - '--platform'
        - 'managed'
        - '--memory'
        - '2Gi'
        - '--timeout'
        - '300'
        - '--allow-unauthenticated'

  images:
    - 'gcr.io/$PROJECT_ID/slop-video-backend:$COMMIT_SHA'

  options:
    logging: CLOUD_LOGGING_ONLY
  ```
- **Files**: `backend/cloudbuild.yaml`
- **Parallel?**: Yes (independent of GitHub Actions)

### Subtask T073 – Update frontend environment variables for production

- **Purpose**: Configure production backend URL
- **Steps**:
  1. Add BACKEND_URL to GitHub repository variables (Settings → Secrets and variables → Variables)
  2. Update `frontend/.env.production` template:
     ```
     VITE_BACKEND_URL=https://slop-video-backend-HASH.run.app
     ```
  3. Document that BACKEND_URL must be set after first backend deployment
  4. Update frontend code to use environment variable:
     ```typescript
     const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
     ```
- **Files**: `frontend/.env.production`, documentation
- **Parallel?**: No (depends on knowing Cloud Run URL)

### Subtask T074 – Document deployment process

- **Purpose**: Enable maintainers to deploy and troubleshoot
- **Steps**:
  1. Add deployment section to README.md or create DEPLOYMENT.md
  2. Document:
     - Required GitHub secrets (GCP_PROJECT_ID, GCP_SA_KEY)
     - Required GitHub variables (BACKEND_URL)
     - How to create GCP service account with required permissions
     - How to manually trigger deployments
     - How to verify deployments succeeded
     - Troubleshooting common issues
  ```markdown
  ## Deployment

  ### Prerequisites

  1. Google Cloud project with Cloud Run API enabled
  2. Service account with roles:
     - Cloud Run Admin
     - Storage Admin (for Container Registry)
  3. GitHub repository secrets configured

  ### GitHub Secrets

  | Secret | Description |
  |--------|-------------|
  | GCP_PROJECT_ID | Your Google Cloud project ID |
  | GCP_SA_KEY | Service account JSON key (base64 encoded) |

  ### GitHub Variables

  | Variable | Description |
  |----------|-------------|
  | BACKEND_URL | Cloud Run service URL (set after first backend deploy) |

  ### Manual Deployment

  Frontend:
  ```bash
  cd frontend
  npm run build
  # Upload dist/ to GitHub Pages
  ```

  Backend:
  ```bash
  cd backend
  gcloud builds submit --config cloudbuild.yaml
  ```
  ```
- **Files**: `README.md` or `DEPLOYMENT.md`
- **Parallel?**: No (final documentation)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GCP credentials exposed | Use GitHub encrypted secrets, rotate keys regularly |
| CORS issues in production | Verify Cloud Run URL matches frontend CORS allowlist |
| GitHub Pages 404 on refresh | Add 404.html SPA redirect |
| Build fails silently | Add Slack/email notifications to workflows |

## Definition of Done Checklist

- [ ] Frontend workflow deploys to GitHub Pages
- [ ] Backend workflow deploys to Cloud Run
- [ ] GitHub Pages serves frontend correctly
- [ ] Cloud Build config works for manual deploys
- [ ] Production environment variables configured
- [ ] Deployment documentation complete
- [ ] Both deployments tested end-to-end
- [ ] `tasks.md` updated with WP11 completion

## Review Guidance

- Verify workflow YAML syntax is valid
- Check secrets/variables are documented but not exposed
- Test deployment with minimal change to verify trigger works
- Confirm CORS settings allow frontend to call backend

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.analyze remediation.
- 2025-11-26T21:56:01Z – claude – shell_pid=96350 – lane=doing – Started implementation of CI/CD deployment workflows
