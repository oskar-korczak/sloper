---
work_package_id: "WP08"
subtasks:
  - "T047"
  - "T048"
  - "T049"
  - "T050"
  - "T051"
  - "T052"
  - "T053"
  - "T054"
title: "Backend Video Assembly"
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
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP08-video-assembly-backend.md](kitty-specs/001-slop-video-generator/tasks/planned/WP08-video-assembly-backend.md)*

# Work Package Prompt: WP08 – Backend Video Assembly

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- FastAPI backend with /health and /assemble-video endpoints
- FFmpeg assembles images and audio into video
- Video returned with correct headers for download
- Proper error handling and CORS configuration

**Acceptance Criteria (from spec.md)**:
- FR-027: Assets sent to backend assembly endpoint
- FR-028: Silent video created from images with durations
- FR-029: Video combined with concatenated audio
- FR-030: Assembled video returned to frontend

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/contracts/video-assembly.yaml` - OpenAPI spec
  - `kitty-specs/001-slop-video-generator/research.md` - FFmpeg commands
  - `kitty-specs/001-slop-video-generator/quickstart.md` - Backend setup
- **Dependencies**: WP01 (backend setup)
- **FFmpeg**: Must be installed in container
- **Cloud Run**: 2GB memory, 300s timeout

## Subtasks & Detailed Guidance

### Subtask T047 – Implement /health endpoint

- **Purpose**: Health check for load balancer
- **Steps**:
  1. Create `backend/src/routes/health.py`
  2. Return status and version
  3. Register router in main.py
  ```python
  from fastapi import APIRouter

  router = APIRouter()

  @router.get("/health")
  async def health_check():
      return {"status": "healthy", "version": "1.0.0"}
  ```
- **Files**: `backend/src/routes/health.py`, `backend/src/main.py`
- **Parallel?**: No (foundation)

### Subtask T048 – Create Pydantic models for AssemblyMetadata

- **Purpose**: Validate request payload
- **Steps**:
  1. Create `backend/src/models/requests.py`
  2. Define models matching OpenAPI spec
  ```python
  from pydantic import BaseModel
  from typing import List

  class SceneMetadata(BaseModel):
      index: int
      imageDuration: float  # Duration to display this image in seconds

  class Resolution(BaseModel):
      width: int
      height: int

  class AssemblyMetadata(BaseModel):
      scenes: List[SceneMetadata]
      resolution: Resolution
      frameRate: int = 24

  class ErrorResponse(BaseModel):
      error: str
      message: str
      details: dict | None = None
  ```
- **Files**: `backend/src/models/requests.py`, `backend/src/models/__init__.py`
- **Parallel?**: No (needed for endpoint)

### Subtask T049 – Implement /assemble-video endpoint

- **Purpose**: Accept multipart form data and orchestrate assembly (FR-027)
- **Steps**:
  1. Create `backend/src/routes/assemble.py`
  2. Parse metadata JSON from form field
  3. Accept image and audio files
  4. Call FFmpeg service
  5. Return video with headers
  ```python
  import json
  import tempfile
  from pathlib import Path
  from fastapi import APIRouter, File, Form, UploadFile, HTTPException
  from fastapi.responses import FileResponse
  from ..models.requests import AssemblyMetadata, ErrorResponse
  from ..services.ffmpeg import assemble_video

  router = APIRouter()

  @router.post("/assemble-video")
  async def assemble_video_endpoint(
      metadata: str = Form(...),
      images: list[UploadFile] = File(...),
      audio: list[UploadFile] = File(...)
  ):
      try:
          # Parse metadata
          meta = AssemblyMetadata.model_validate_json(metadata)

          # Validate file counts match scenes
          if len(images) != len(meta.scenes):
              raise HTTPException(
                  status_code=400,
                  detail={"error": "INVALID_REQUEST", "message": f"Expected {len(meta.scenes)} images, got {len(images)}"}
              )
          if len(audio) != len(meta.scenes):
              raise HTTPException(
                  status_code=400,
                  detail={"error": "INVALID_REQUEST", "message": f"Expected {len(meta.scenes)} audio files, got {len(audio)}"}
              )

          # Create temp directory for processing
          with tempfile.TemporaryDirectory() as tmpdir:
              tmppath = Path(tmpdir)

              # Save uploaded files
              image_paths = []
              audio_paths = []

              for i, img in enumerate(images):
                  path = tmppath / f"image_{i}.png"
                  with open(path, "wb") as f:
                      f.write(await img.read())
                  image_paths.append(path)

              for i, aud in enumerate(audio):
                  path = tmppath / f"audio_{i}.mp3"
                  with open(path, "wb") as f:
                      f.write(await aud.read())
                  audio_paths.append(path)

              # Assemble video
              output_path = tmppath / "output.mp4"
              duration = await assemble_video(
                  image_paths=image_paths,
                  audio_paths=audio_paths,
                  scene_durations=[s.imageDuration for s in meta.scenes],
                  resolution=(meta.resolution.width, meta.resolution.height),
                  frame_rate=meta.frameRate,
                  output_path=output_path,
              )

              # Return video file
              from datetime import date
              filename = f"slop-video-{date.today().isoformat()}.mp4"

              return FileResponse(
                  path=output_path,
                  media_type="video/mp4",
                  filename=filename,
                  headers={
                      "X-Video-Duration": str(duration),
                      "Content-Disposition": f'attachment; filename="{filename}"',
                  },
              )

      except json.JSONDecodeError:
          raise HTTPException(
              status_code=400,
              detail={"error": "INVALID_METADATA", "message": "Invalid JSON in metadata field"}
          )
      except Exception as e:
          raise HTTPException(
              status_code=500,
              detail={"error": "FFMPEG_ERROR", "message": str(e)}
          )
  ```
- **Files**: `backend/src/routes/assemble.py`
- **Parallel?**: No (depends on T048)

### Subtask T050 – Implement FFmpeg image-to-video conversion

- **Purpose**: Create video from images with specified durations (FR-028)
- **Steps**:
  1. Create `backend/src/services/ffmpeg.py`
  2. Create silent video segments for each image
  3. Concatenate into single video
  ```python
  import asyncio
  import subprocess
  from pathlib import Path
  from typing import List, Tuple

  async def create_image_video(
      image_path: Path,
      duration: float,
      resolution: Tuple[int, int],
      frame_rate: int,
      output_path: Path,
  ) -> None:
      """Create a video from a single image with specified duration."""
      width, height = resolution

      cmd = [
          "ffmpeg", "-y",
          "-loop", "1",
          "-i", str(image_path),
          "-t", str(duration),
          "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
          "-r", str(frame_rate),
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          str(output_path),
      ]

      process = await asyncio.create_subprocess_exec(
          *cmd,
          stdout=subprocess.PIPE,
          stderr=subprocess.PIPE,
      )
      stdout, stderr = await process.communicate()

      if process.returncode != 0:
          raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")

  async def concatenate_videos(
      video_paths: List[Path],
      output_path: Path,
  ) -> None:
      """Concatenate multiple videos into one."""
      # Create concat file
      concat_file = output_path.parent / "concat.txt"
      with open(concat_file, "w") as f:
          for path in video_paths:
              f.write(f"file '{path}'\n")

      cmd = [
          "ffmpeg", "-y",
          "-f", "concat",
          "-safe", "0",
          "-i", str(concat_file),
          "-c", "copy",
          str(output_path),
      ]

      process = await asyncio.create_subprocess_exec(
          *cmd,
          stdout=subprocess.PIPE,
          stderr=subprocess.PIPE,
      )
      stdout, stderr = await process.communicate()

      if process.returncode != 0:
          raise RuntimeError(f"FFmpeg concat failed: {stderr.decode()}")
  ```
- **Files**: `backend/src/services/ffmpeg.py`
- **Parallel?**: Yes (can develop alongside T051)

### Subtask T051 – Implement FFmpeg audio concatenation

- **Purpose**: Concatenate all audio files into single track (FR-029)
- **Steps**:
  1. Add audio concatenation to `backend/src/services/ffmpeg.py`
  2. Use filter_complex for smooth concatenation
  ```python
  async def concatenate_audio(
      audio_paths: List[Path],
      output_path: Path,
  ) -> float:
      """Concatenate multiple audio files into one. Returns total duration."""
      # Build filter complex for audio concat
      inputs = []
      filter_parts = []

      for i, path in enumerate(audio_paths):
          inputs.extend(["-i", str(path)])
          filter_parts.append(f"[{i}:a]")

      filter_complex = f"{''.join(filter_parts)}concat=n={len(audio_paths)}:v=0:a=1[out]"

      cmd = [
          "ffmpeg", "-y",
          *inputs,
          "-filter_complex", filter_complex,
          "-map", "[out]",
          "-c:a", "aac",
          str(output_path),
      ]

      process = await asyncio.create_subprocess_exec(
          *cmd,
          stdout=subprocess.PIPE,
          stderr=subprocess.PIPE,
      )
      stdout, stderr = await process.communicate()

      if process.returncode != 0:
          raise RuntimeError(f"FFmpeg audio concat failed: {stderr.decode()}")

      # Get duration
      return await get_media_duration(output_path)

  async def get_media_duration(path: Path) -> float:
      """Get duration of media file in seconds."""
      cmd = [
          "ffprobe",
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          str(path),
      ]

      process = await asyncio.create_subprocess_exec(
          *cmd,
          stdout=subprocess.PIPE,
          stderr=subprocess.PIPE,
      )
      stdout, stderr = await process.communicate()

      if process.returncode != 0:
          raise RuntimeError(f"FFprobe failed: {stderr.decode()}")

      return float(stdout.decode().strip())
  ```
- **Files**: `backend/src/services/ffmpeg.py`
- **Parallel?**: Yes (can develop alongside T050)

### Subtask T052 – Implement FFmpeg video+audio merge

- **Purpose**: Merge silent video with audio track (FR-029)
- **Steps**:
  1. Add merge function to `backend/src/services/ffmpeg.py`
  2. Create main assemble_video orchestrator
  ```python
  async def merge_video_audio(
      video_path: Path,
      audio_path: Path,
      output_path: Path,
  ) -> None:
      """Merge video with audio track."""
      cmd = [
          "ffmpeg", "-y",
          "-i", str(video_path),
          "-i", str(audio_path),
          "-c:v", "copy",
          "-c:a", "aac",
          "-shortest",
          str(output_path),
      ]

      process = await asyncio.create_subprocess_exec(
          *cmd,
          stdout=subprocess.PIPE,
          stderr=subprocess.PIPE,
      )
      stdout, stderr = await process.communicate()

      if process.returncode != 0:
          raise RuntimeError(f"FFmpeg merge failed: {stderr.decode()}")

  async def assemble_video(
      image_paths: List[Path],
      audio_paths: List[Path],
      scene_durations: List[float],
      resolution: Tuple[int, int],
      frame_rate: int,
      output_path: Path,
  ) -> float:
      """Main assembly function - orchestrates the full pipeline."""
      tmpdir = output_path.parent

      # 1. Create video segments for each image
      segment_paths = []
      for i, (img_path, duration) in enumerate(zip(image_paths, scene_durations)):
          segment_path = tmpdir / f"segment_{i}.mp4"
          await create_image_video(img_path, duration, resolution, frame_rate, segment_path)
          segment_paths.append(segment_path)

      # 2. Concatenate video segments
      silent_video_path = tmpdir / "silent_video.mp4"
      await concatenate_videos(segment_paths, silent_video_path)

      # 3. Concatenate audio files
      combined_audio_path = tmpdir / "combined_audio.aac"
      await concatenate_audio(audio_paths, combined_audio_path)

      # 4. Merge video and audio
      await merge_video_audio(silent_video_path, combined_audio_path, output_path)

      # Return final duration
      return await get_media_duration(output_path)
  ```
- **Files**: `backend/src/services/ffmpeg.py`
- **Parallel?**: No (depends on T050, T051)

### Subtask T053 – Add error handling and logging

- **Purpose**: Proper error responses and debugging info (FR-035, FR-037)
- **Steps**:
  1. Add exception handlers to `backend/src/routes/assemble.py`
  2. Add logging throughout the assembly process
  3. Handle specific error types (file not found, FFmpeg error, timeout)
  ```python
  import logging

  logger = logging.getLogger(__name__)

  @router.post("/assemble-video")
  async def assemble_video_endpoint(...):
      logger.info(f"Starting video assembly: {len(images)} images, {len(audio)} audio files")

      try:
          # ... existing code with added logging ...
          logger.info(f"Video assembled successfully: {duration}s")

      except asyncio.TimeoutError:
          logger.error("Video assembly timed out")
          raise HTTPException(
              status_code=504,
              detail={"error": "TIMEOUT", "message": "Video assembly timed out"}
          )
      except FileNotFoundError as e:
          logger.error(f"File not found: {e}")
          raise HTTPException(
              status_code=400,
              detail={"error": "MISSING_FILES", "message": str(e)}
          )
      except Exception as e:
          logger.exception("Video assembly failed")
          raise HTTPException(
              status_code=500,
              detail={"error": "FFMPEG_ERROR", "message": str(e)}
          )
  ```
- **Files**: `backend/src/routes/assemble.py`, `backend/src/services/ffmpeg.py`
- **Parallel?**: No (enhancement)

### Subtask T054 – Configure CORS middleware

- **Purpose**: Allow frontend to call backend API
- **Steps**:
  1. Update `backend/src/main.py` with proper CORS config
  2. Include routers
  ```python
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  from .routes import health, assemble

  app = FastAPI(title="Slop Video Assembly API", version="1.0.0")

  # CORS configuration
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "http://localhost:5173",  # Vite dev server
          "https://*.github.io",    # GitHub Pages
      ],
      allow_credentials=True,
      allow_methods=["GET", "POST"],
      allow_headers=["*"],
  )

  # Include routers
  app.include_router(health.router)
  app.include_router(assemble.router)
  ```
- **Files**: `backend/src/main.py`
- **Parallel?**: No (configuration)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| FFmpeg not found | Ensure installed in Dockerfile, check on startup |
| Timeout on long videos | Set 300s timeout, optimize FFmpeg settings |
| Temp disk full | Use Cloud Run /tmp (tmpfs), clean up after |
| Large file uploads | Set max size limit, validate early |

## Definition of Done Checklist

- [ ] /health endpoint returns 200 with status
- [ ] Pydantic models validate requests correctly
- [ ] /assemble-video accepts multipart form data
- [ ] FFmpeg creates video from images
- [ ] FFmpeg concatenates audio
- [ ] FFmpeg merges video and audio
- [ ] Error responses match OpenAPI spec
- [ ] CORS allows frontend requests
- [ ] `tasks.md` updated with WP08 completion

## Review Guidance

- Test with curl using sample files
- Verify video plays correctly
- Check error responses for invalid input
- Confirm Docker image builds and runs

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-26T14:06:43Z – system – shell_pid= – lane=doing – Moved to doing
- 2025-11-26T14:09:26Z – system – shell_pid= – lane=for_review – Moved to for_review
- 2025-11-26T14:54:34Z – claude-reviewer – shell_pid=$$ – lane=done – Code review approved: Backend video assembly with FFmpeg pipeline, proper error handling, CORS config
