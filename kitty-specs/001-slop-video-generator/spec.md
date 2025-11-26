# Feature Specification: Slop Video Generator Web UI

**Feature Branch**: `001-slop-video-generator`
**Created**: 2025-11-26
**Status**: Draft
**Input**: User description: "A React/Next.js web application that provides a UI for the oskarissimus/slop video generation pipeline with multi-stage workflow: configuration, scene generation with streaming LLM, asset generation, FFmpeg video assembly on Cloud Run, and video playback/download."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Video from Prompt (Priority: P1)

A user wants to create a short-form video by providing a text prompt. They configure their API keys, enter a creative prompt, review and edit the generated scenes, wait for assets to generate, and receive a downloadable video.

**Why this priority**: This is the core end-to-end workflow that delivers the primary value proposition. Without this, the application has no purpose.

**Independent Test**: Can be fully tested by entering a prompt, progressing through all stages, and receiving a playable/downloadable video file.

**Acceptance Scenarios**:

1. **Given** the user is on the configuration screen, **When** they enter valid API keys for OpenAI and ElevenLabs, **Then** the keys are validated and stored for the session
2. **Given** valid API keys are configured, **When** the user enters a prompt and clicks "Generate Scenes", **Then** scenes appear progressively as the LLM response streams
3. **Given** scenes are displayed, **When** the user edits a scene's script or image description, **Then** the changes are preserved when proceeding to asset generation
4. **Given** the user proceeds to asset generation, **When** assets are being generated, **Then** progress is visible for each scene's image and audio
5. **Given** all assets are generated, **When** the user clicks "Generate Video", **Then** the backend assembles the video and returns it for playback
6. **Given** the video is ready, **When** the user views the result, **Then** they can play the video in-browser and download it

---

### User Story 2 - Configure Video Settings (Priority: P2)

A user wants to customize video parameters such as resolution, frame rate, number of scenes, TTS voice settings, and image quality before generating content.

**Why this priority**: Configuration enables users to tailor output to their needs, but the application works with sensible defaults if skipped.

**Independent Test**: Can be tested by modifying configuration values and verifying they affect the generated output (e.g., different resolution, more/fewer scenes).

**Acceptance Scenarios**:

1. **Given** the user is on the configuration screen, **When** the page loads, **Then** all settings display default values from the reference implementation
2. **Given** configuration options are displayed, **When** the user changes resolution to 1920x1080, **Then** the value is stored and used during video generation
3. **Given** the user selects a different TTS voice or speed, **When** assets are generated, **Then** the audio reflects the selected voice settings
4. **Given** the user sets num_images to 10, **When** scenes are generated, **Then** the LLM is instructed to produce approximately 10 scenes

---

### User Story 3 - Select LLM Provider and Model (Priority: P2)

A user wants to choose between different LLM providers (OpenAI, DeepSeek) and specific models for scene generation, with visibility into pricing and context limits.

**Why this priority**: Flexibility in LLM selection allows cost optimization and model experimentation, but defaults work without this.

**Independent Test**: Can be tested by selecting different providers/models and verifying scenes are generated using the selected model.

**Acceptance Scenarios**:

1. **Given** the user is on the configuration screen, **When** they view the LLM provider dropdown, **Then** they see options for OpenAI and DeepSeek
2. **Given** a provider is selected, **When** the user views the model dropdown, **Then** available models for that provider are listed with context limits
3. **Given** a model is selected, **When** scenes are generated, **Then** the response includes token usage information
4. **Given** token usage is available, **When** generation completes, **Then** estimated cost is displayed based on actual usage and current pricing

---

### User Story 4 - Monitor Asset Generation Progress (Priority: P2)

A user wants to see real-time progress of image and audio generation, including which assets are complete, in progress, or pending.

**Why this priority**: Visibility into async operations improves user experience and helps identify failures early.

**Independent Test**: Can be tested by starting asset generation and verifying progress indicators update in real-time.

**Acceptance Scenarios**:

1. **Given** asset generation has started, **When** viewing the asset generation screen, **Then** each scene shows status for both image and audio (pending/generating/complete/failed)
2. **Given** multiple assets are generating concurrently, **When** one completes, **Then** its status updates immediately without page refresh
3. **Given** an asset fails to generate, **When** viewing its status, **Then** a descriptive error message is displayed with option to retry

---

### User Story 5 - Handle Errors Gracefully (Priority: P3)

A user encounters an error during any stage of the workflow and receives clear, actionable feedback about what went wrong and how to resolve it.

**Why this priority**: Good error handling improves reliability and user trust, but the happy path works without it.

**Independent Test**: Can be tested by simulating failures (invalid API key, network error, API rate limit) and verifying appropriate error messages appear.

**Acceptance Scenarios**:

1. **Given** the user enters an invalid API key, **When** they attempt to generate scenes, **Then** a clear message indicates the API key is invalid
2. **Given** an API rate limit is hit during asset generation, **When** the error occurs, **Then** the user sees which asset failed and can retry after waiting
3. **Given** the video assembly backend is unavailable, **When** the user clicks "Generate Video", **Then** a message explains the service is temporarily unavailable
4. **Given** any error occurs, **When** the error is logged, **Then** it is shipped to Google Cloud Logging with context (user action, request details, stack trace)

---

### User Story 6 - View and Download Completed Video (Priority: P1)

A user has completed the video generation process and wants to preview the result and download it to their device.

**Why this priority**: Delivering the final output is essential to completing the core workflow.

**Independent Test**: Can be tested by completing video generation and verifying playback controls work and download produces a valid video file.

**Acceptance Scenarios**:

1. **Given** video assembly is complete, **When** the result screen loads, **Then** the video is displayed in a player with standard controls (play, pause, seek, volume)
2. **Given** the video is displayed, **When** the user clicks "Download", **Then** the video file downloads to their device with an appropriate filename
3. **Given** the video is playing, **When** the user seeks to a specific timestamp, **Then** playback continues from that position

---

### Edge Cases

- What happens when the LLM returns malformed JSON for scenes? Display parse error and allow user to retry with a different model or modified prompt.
- What happens when image generation returns a very dark image? The system should auto-correct brightness (per reference implementation).
- What happens when the user closes the browser mid-generation? State is lost; user must restart. A warning should appear if they attempt to navigate away.
- What happens when ElevenLabs API is slow and TTS times out? Display timeout error for affected scenes with retry option.
- What happens when the generated audio is much longer than expected? Video assembly adjusts; user is warned if video exceeds typical duration.
- What happens when API keys are valid but have insufficient credits? Display quota/credit error from API response.

## Requirements *(mandatory)*

### Functional Requirements

**Configuration & Setup**
- **FR-001**: System MUST provide input fields for API keys: OpenAI, DeepSeek, ElevenLabs
- **FR-002**: System MUST validate API keys before allowing progression to scene generation
- **FR-003**: System MUST store API keys only in browser session (not persisted to server or local storage)
- **FR-004**: System MUST display LLM provider selection with options: OpenAI, DeepSeek
- **FR-005**: System MUST display model selection dropdown filtered by selected provider
- **FR-006**: System MUST show model metadata: context window size and pricing information
- **FR-007**: System MUST fetch pricing dynamically from API responses or calculate from token usage
- **FR-008**: System MUST provide configuration fields for video settings with these defaults:
  - Resolution: 1024x1536 (width x height)
  - Frame rate: 24 fps
  - Number of images/scenes: 18
  - Target duration: 180 seconds
  - Image model: gpt-image-1
  - Image quality: low
  - TTS model: eleven_multilingual_v2
  - TTS voice ID: Bx2lBwIZJBilRBVc3AGO
  - TTS speed: 1.1
  - TTS concurrency: 4
  - Temperature: 0.7

**Scene Generation**
- **FR-009**: System MUST accept a text prompt from the user for video topic
- **FR-010**: System MUST send prompt to selected LLM with system message for scene generation
- **FR-011**: System MUST display scenes progressively as the LLM response is received
- **FR-012**: System MUST parse LLM response into structured scenes with "script" and "image_description" fields
- **FR-013**: System MUST display each scene as a collapsible section, expanded by default
- **FR-014**: System MUST provide editable text fields for script and image_description per scene
- **FR-015**: System MUST calculate target word count based on 2.5 words per second for target duration
- **FR-016**: System MUST display token usage after scene generation completes
- **FR-017**: System MUST allow user to add or remove scenes before proceeding

**Asset Generation**
- **FR-018**: System MUST generate images from image descriptions using the configured image generation service
- **FR-019**: System MUST generate audio from scripts using the configured text-to-speech service with timing data
- **FR-020**: System MUST provide surrounding scene context to TTS for natural speech transitions between scenes
- **FR-021**: System MUST limit TTS concurrency to configured value (default: 4 concurrent requests)
- **FR-022**: System MUST limit image generation concurrency to maximum 12 concurrent requests
- **FR-023**: System MUST display generation progress for each asset (pending/generating/complete/failed)
- **FR-024**: System MUST auto-correct dark images by adjusting brightness and contrast
- **FR-025**: System MUST flatten transparent images to white background to prevent black frames
- **FR-026**: System MUST allow retry of failed individual assets without restarting entire generation

**Video Assembly**
- **FR-027**: System MUST send all generated assets to backend video assembly endpoint
- **FR-028**: Backend MUST create silent video from images with durations calculated from audio timing data
- **FR-029**: Backend MUST combine silent video with concatenated audio track
- **FR-030**: Backend MUST return assembled video file to frontend
- **FR-031**: System MUST display progress indicator during video assembly

**Video Output**
- **FR-032**: System MUST display completed video in an embedded player with standard controls
- **FR-033**: System MUST provide download button for the completed video
- **FR-034**: System MUST generate appropriate filename for downloaded video

**Error Handling & Logging**
- **FR-035**: System MUST display user-friendly error messages for all failure scenarios
- **FR-036**: System MUST include actionable guidance in error messages (what to do next)
- **FR-037**: System MUST log all errors to Google Cloud Logging with context
- **FR-038**: System MUST include in logs: timestamp, user action, request details, error type, stack trace
- **FR-039**: System MUST warn user before navigating away during active generation

**Infrastructure**
- **FR-040**: Frontend MUST be deployable to GitHub Pages via GitHub Actions
- **FR-041**: Backend video assembly service MUST be deployable to Google Cloud Run
- **FR-042**: System MUST support local development with environment variables for API keys

### Key Entities

- **Configuration**: User-provided API keys, selected LLM provider/model, video settings (resolution, fps, duration, etc.), TTS settings (voice, speed, model)
- **Scene**: Script text for voice narration, image description for visual generation, order/index in sequence
- **Asset**: Type (image or audio), associated scene, generation status, file data or URL, error information if failed
- **Video**: Collection of assets, assembly status, final video file/URL, metadata (duration, resolution)
- **GenerationJob**: Current stage in workflow, progress percentage, list of pending/complete/failed operations, error log

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the full workflow (configure, generate scenes, generate assets, assemble video, download) in under 15 minutes for a standard 18-scene video
- **SC-002**: Scene generation displays first scene within 5 seconds of LLM response starting
- **SC-003**: 95% of asset generation attempts succeed on first try under normal API conditions
- **SC-004**: Video assembly completes within 2 minutes for a 3-minute video with 18 scenes
- **SC-005**: All errors display user-actionable messages within 3 seconds of failure
- **SC-006**: Users can successfully edit scenes and see edits reflected in generated assets 100% of the time
- **SC-007**: System handles 10 concurrent users without degradation (frontend is client-side; backend scales via Cloud Run)
- **SC-008**: Pricing estimates are within 10% accuracy of actual API charges
- **SC-009**: 100% of errors are captured in centralized logging with full context
- **SC-010**: Users can retry failed assets without losing successfully generated assets

## Assumptions

- Users will provide their own API keys for OpenAI, DeepSeek, and ElevenLabs
- Users have modern browsers with JavaScript enabled (Chrome, Firefox, Safari, Edge - last 2 versions)
- API keys have sufficient credits/quota for intended usage
- Network connectivity is stable during generation (no offline support)
- ElevenLabs eleven_multilingual_v2 model supports previous_text/next_text context parameters
- OpenAI image generation API returns base64-encoded images
- Google Cloud Run can handle FFmpeg video processing within reasonable time limits
- GitHub Pages can host a Next.js static export
