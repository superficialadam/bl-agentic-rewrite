# Image Generation

AI image generation for creating visual assets.

**Prerequisites:** Read 00-FOUNDATIONS.md and 01-DATA-MODEL.md first.

---

## Overview

The Generate panel allows creating images from text prompts. Generated images can be dragged to the timeline, saved as assets, or downloaded.

---

## Generate Panel UI

Located in the Edit view, alongside the asset browser.

### Components

1. **Mode Toggle**: Image / Video
   - Video is disabled for vertical slice
   - Default to Image

2. **Prompt Field**: Text input
   - Placeholder: "Describe the image you want to create..."
   - Multi-line textarea

3. **Reference Image** (optional): Single drop zone
   - Accept drag-drop or click to upload
   - Show thumbnail when populated
   - X button to clear

4. **Settings**:
   - Resolution: dropdown (512, 768, 1024) — default 1024
   - Aspect Ratio: dropdown (16:9, 1:1, 9:16) — default 16:9

5. **Generate Button**: Primary action
   - Disabled when prompt is empty
   - Shows loading state during generation

6. **Results Area**: Grid of generated images
   - Each result is draggable
   - Hover shows: "Save as Asset", "Download" buttons

---

## Generation Flow

### 1. User Submits

User enters prompt, optionally adds reference image, clicks Generate.

### 2. Client Request

POST to /api/generate/image with:
- prompt: string
- reference_url: string (optional, if reference image uploaded)
- width: number (calculated from resolution + aspect ratio)
- height: number (calculated from resolution + aspect ratio)

### 3. Server Processing

1. Validate inputs
2. If reference image provided and is a local file, upload to temp storage first
3. Call Replicate API (flux model)
4. Wait for completion (synchronous call, ~10-30 seconds)
5. Download result image
6. Upload to Supabase storage bucket 'rewrite-assets'
7. Do NOT create asset record yet (user may discard)
8. Return temporary URL

### 4. Display Result

Show generated image in Results Area:
- Thumbnail preview
- Draggable for timeline placement
- Action buttons on hover

---

## Replicate Integration

Using flux-schnell model for fast generation.

### API Call

POST https://api.replicate.com/v1/predictions

Headers:
- Authorization: Token {REPLICATE_API_TOKEN}
- Content-Type: application/json

Body:
- version: flux-schnell model version
- input:
  - prompt: user prompt
  - width: target width
  - height: target height
  - num_outputs: 1
  - (if reference): image: reference image URL

### Polling

Replicate returns a prediction ID. Poll GET /predictions/{id} until status is 'succeeded' or 'failed'.

Polling interval: 1 second
Timeout: 60 seconds

### Result

On success, prediction.output contains array of image URLs.
Download the image, upload to our storage.

---

## Resolution Calculation

| Resolution | Aspect 16:9 | Aspect 1:1 | Aspect 9:16 |
|------------|-------------|------------|-------------|
| 512 | 912×512 | 512×512 | 512×912 |
| 768 | 1368×768 | 768×768 | 768×1368 |
| 1024 | 1824×1024 | 1024×1024 | 1024×1824 |

Note: Actual dimensions adjusted to be divisible by 8 (model requirement).

---

## Results Handling

### Temporary State

Generated images are stored in ephemeral state with:
- temp_id: UUID for tracking
- file_url: Supabase storage URL
- prompt: the prompt used
- width, height: dimensions

No database record created yet.

### Drag to Timeline

When user drags result to timeline:

1. Create rewrite_assets record:
   - project_id: current project
   - name: truncated prompt or "Generated Image"
   - file_type: 'image'
   - file_url: the storage URL
   - width, height: from generation
   - metadata: { prompt, generated_at }

2. Create rewrite_clips record:
   - track_id: target video track
   - asset_id: new asset ID
   - start_frame: drop position
   - duration_frames: 90 (3 seconds at 30fps, default image duration)
   - name: same as asset name

3. Remove from ephemeral results (optional, or keep for re-use)

### Save as Asset

When user clicks "Save as Asset":

1. Create rewrite_assets record (same as above)
2. Show toast: "Saved to assets"
3. Keep in results for potential timeline use

### Download

When user clicks "Download":

1. Fetch image from file_url
2. Trigger browser download with filename: `generated-{timestamp}.png`

### Discard

Results are ephemeral. On page navigation or panel close, unsaved results are lost. The storage file remains but is orphaned (cleanup can be handled separately).

---

## Reference Images

### Upload Flow

1. User drags image to reference zone or clicks to select
2. Upload to Supabase storage (temp path)
3. Store URL in ephemeral state
4. Show thumbnail preview

### Usage

Reference image is passed to the model as an input image. The model uses it for:
- Style reference
- Composition guidance
- img2img transformation

Behavior depends on model capabilities.

### Cleanup

Reference images in temp storage can be cleaned up periodically (not in vertical slice scope).

---

## API Endpoint

### POST /api/generate/image

Request:
- prompt: string (required)
- reference_url: string (optional)
- width: number (required)
- height: number (required)

Server processing:
1. Validate inputs
2. Call Replicate API
3. Poll for completion
4. Download result
5. Upload to Supabase storage
6. Trace the operation

Response:
- file_url: string (Supabase storage URL)
- width: number
- height: number

Error response:
- error: string
- code: string (e.g., 'REPLICATE_ERROR', 'TIMEOUT', 'UPLOAD_FAILED')

---

## Error Handling

| Error | Handling |
|-------|----------|
| Empty prompt | Disable Generate button, show validation message |
| Replicate rate limit | Show "Rate limited, please wait..." with retry countdown |
| Replicate API error | Show error toast with message, log to traces |
| Timeout (60s) | Show "Generation timed out, please try again" |
| Upload failed | Show error, log to traces |
| Invalid dimensions | Adjust to valid dimensions automatically |

All errors are traced with full context.

---

## Loading States

### During Generation

1. Generate button shows spinner + "Generating..."
2. Button is disabled
3. Progress indication if available from Replicate

### After Generation

1. Result appears in Results Area
2. Generate button re-enables
3. User can generate more (results accumulate)

---

## Testing

### Unit Tests

- Resolution calculation from settings
- Dimension adjustment to be divisible by 8

### Mission Tests

1. **Generate and view**
   - Open generate panel
   - Enter prompt "a red apple on a wooden table"
   - Click Generate
   - Wait for completion (may take 10-30s)
   - Assert result appears in Results Area
   - Assert image is visible (not broken)

2. **Generate and place on timeline**
   - Generate an image
   - Drag to V1 track at frame 0
   - Query rewrite_assets: assert image asset exists
   - Query rewrite_clips: assert clip exists at frame 0
   - Assert preview canvas shows the image

3. **Generate with reference**
   - Upload a reference image
   - Enter prompt
   - Generate
   - Assert generation completes
   - Assert result reflects reference influence (visual inspection or VLM check)
