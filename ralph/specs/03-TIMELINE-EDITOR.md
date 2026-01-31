# Timeline Editor

The timeline editor provides frame-accurate video editing with clips on tracks.

**Prerequisites:** Read 00-FOUNDATIONS.md and 01-DATA-MODEL.md first.

---

## Overview

The timeline editor has four areas:
- **Preview Canvas** (top): Shows composited frame at playhead position
- **Toolbar** (middle): Transport controls, timecode, zoom, save indicator
- **Track Sidebar** (left of timeline): Track names, mute/hide toggles
- **Timeline Canvas** (bottom): Clips, ruler, playhead

---

## Canvas Rendering

Use Raw Canvas 2D API. No Konva, no Fabric.js, no libraries.

A timeline is simple shapes:
- Rectangles for clips
- Lines for ruler ticks and playhead
- Text for labels and timecode

### Canvas Setup

Create a single canvas element. On each render:
1. Clear canvas
2. Draw ruler (background, ticks, labels)
3. Draw tracks (background lanes)
4. Draw clips (rectangles with labels)
5. Draw playhead (vertical line)
6. Draw selection highlight if any

### Coordinate System

- X axis: time (frames converted to pixels based on zoom)
- Y axis: tracks (fixed height per track, stacked vertically)

Conversion functions:
- frameToX(frame, zoom, scrollX) → pixel position
- xToFrame(x, zoom, scrollX) → frame number
- trackIndexToY(index, trackHeight) → pixel position

### Zoom and Scroll

- Zoom level: pixels per frame (e.g., 2 = 2 pixels per frame)
- Horizontal scroll: offset in pixels
- Store in ephemeral state, persist to localStorage for session continuity

---

## Ruler

The ruler shows timecode at the top of the timeline canvas.

### Tick Density

Adjust based on zoom level:
- Zoomed out: major ticks at 10-second intervals, minor at 1-second
- Zoomed in: major ticks at 1-second intervals, minor at frames

### Labels

Show timecode at major ticks in format: MM:SS:FF (minutes, seconds, frames)

---

## Tracks

Tracks are horizontal lanes for clips.

### Rendering

- Fixed height per track (e.g., 60 pixels)
- Video tracks rendered above audio tracks
- Alternating background colors for visual separation
- Track name in sidebar area

### Track Sidebar

For each track, show:
- Name (e.g., "V1", "A1")
- Mute button (for audio tracks)
- Hide button (for video tracks)

Clicking mute/hide updates rewrite_tracks and re-renders.

---

## Clips

Clips are rectangles on tracks representing media segments.

### Rendering

Position and size:
- x = frameToX(clip.start_frame)
- width = frameToX(clip.start_frame + clip.duration_frames) - x
- y = trackIndexToY(track.order_index)
- height = trackHeight - padding

Visual elements:
- Rectangle with rounded corners
- Clip name as label
- For video/image clips: thumbnail if available
- For audio clips: solid color (no waveform in vertical slice)

### Selection

- Click clip to select
- Selected clip has highlight border
- Store selected clip ID in ephemeral state

---

## Playhead

Vertical line showing current frame position.

### Rendering

- Full height of timeline area
- Distinct color (e.g., red or cyan)
- Triangle or marker at top

### Interaction

- Click on ruler to move playhead
- Drag playhead to scrub
- Update currentFrame in playback engine state

---

## Clip Interactions

### Select

- Click on clip rectangle
- Set selectedClipId in ephemeral state
- Re-render with selection highlight

### Move

1. Mouse down on clip (not edge)
2. Track drag start position and clip's original start_frame
3. On mouse move, calculate new start_frame based on delta
4. Update clip position visually (ephemeral)
5. On mouse up, commit to database:
   - Update rewrite_clips.start_frame
   - Clear drag state

### Trim

1. Mouse down on clip edge (left or right, detect via hit testing)
2. Track which edge and original values
3. On mouse move:
   - Left edge: adjust start_frame and offset_frames, adjust duration_frames
   - Right edge: adjust duration_frames only
4. Update visually (ephemeral)
5. On mouse up, commit to database

### Delete

- Select clip
- Press Backspace or Delete key
- Delete from rewrite_clips
- Remove from local state and re-render

### Add (drag from external source)

1. Drag starts from Generate panel or Asset browser
2. Track drag position over timeline canvas
3. Show drop indicator (vertical line at potential position)
4. On drop:
   - Calculate start_frame from drop x position
   - Determine track from drop y position
   - Create rewrite_clips record
   - Create rewrite_assets record if needed
   - Re-fetch clips and re-render

---

## Playback Engine

Manages video/audio playback synchronized to frame position.

### State

- status: 'stopped' | 'playing' | 'scrubbing'
- currentFrame: number
- frameRate: number (from timeline settings, typically 30)
- duration: number (total frames, from timeline duration_seconds × frame_rate)

### Play

1. Set status = 'playing'
2. Record start timestamp and start frame
3. Start requestAnimationFrame loop
4. On each frame:
   - Calculate elapsed time since start
   - Calculate current frame: startFrame + (elapsed × frameRate)
   - If current frame > duration, stop or loop
   - Update currentFrame
   - Trigger preview canvas render
   - Trigger playhead position update

### Pause

1. Set status = 'stopped'
2. Stop the animation loop
3. Keep currentFrame at last position

### Seek

1. Set currentFrame to target frame
2. Trigger preview canvas render
3. Trigger playhead position update

---

## Preview Canvas

Shows the composited frame at current playhead position.

### Rendering

1. Get currentFrame from playback engine
2. Find all clips on video tracks that contain currentFrame:
   - clip.start_frame <= currentFrame < clip.start_frame + clip.duration_frames
3. For each visible clip, in track order (bottom to top):
   - Calculate source frame: currentFrame - clip.start_frame + clip.offset_frames
   - Get frame from asset (see Frame Extraction below)
   - Draw to preview canvas with clip's opacity

### Frame Extraction

For video assets, use WebCodecs VideoDecoder:
1. Create decoder per asset (cache decoders)
2. Seek to target frame
3. Decode frame
4. Return ImageBitmap

For image assets:
1. Load image once (cache)
2. Return same image for any frame

Fallback if WebCodecs unavailable:
1. Use HTMLVideoElement
2. Set currentTime = frame / frameRate
3. Draw video element to canvas (less accurate)

---

## Audio Playback

Synchronized audio playback during timeline play.

### Setup

1. Create AudioContext
2. For each audio clip visible during playback range:
   - Fetch audio file as ArrayBuffer
   - Decode to AudioBuffer
   - Cache AudioBuffer per asset

### During Playback

1. When play starts, schedule audio clips:
   - Calculate when each clip should start relative to play start time
   - Create AudioBufferSourceNode for each clip
   - Connect to destination
   - Schedule with start(when, offset, duration)
2. When pause, stop all scheduled sources
3. When seek, reschedule from new position

---

## Persistence

### Load Timeline

1. GET /api/timelines/[id]
2. Returns timeline settings, tracks, and clips
3. Initialize canvas with data
4. Subscribe to realtime updates on rewrite_clips and rewrite_tracks

### Save Changes

On gesture completion (not during drag):
- Move clip: PUT /api/clips/[id] with new start_frame
- Trim clip: PUT /api/clips/[id] with new duration_frames, offset_frames
- Delete clip: DELETE /api/clips/[id]
- Add clip: POST /api/timelines/[id]/clips

All mutations are traced.

### Realtime Updates

Subscribe to rewrite_clips changes for current timeline:
- On INSERT: add clip to local state, re-render
- On UPDATE: update clip in local state, re-render
- On DELETE: remove clip from local state, re-render

---

## API Endpoints

### GET /api/timelines/[id]

Returns timeline with tracks and clips.

Response:
- timeline: { id, project_id, name, duration_seconds, frame_rate, width, height }
- tracks: array of { id, name, type, order_index, muted, hidden }
- clips: array of { id, track_id, asset_id, start_frame, duration_frames, offset_frames, name, volume, opacity, asset: { file_url, file_type, duration_ms, width, height } }

### POST /api/timelines/[id]/clips

Create a new clip.

Request:
- track_id: UUID
- asset_id: UUID (optional, for generated content may create asset first)
- start_frame: number
- duration_frames: number
- name: string (optional)

Response:
- clip: the created clip record

### PUT /api/clips/[id]

Update a clip.

Request (partial):
- start_frame: number (optional)
- duration_frames: number (optional)
- offset_frames: number (optional)
- volume: number (optional)
- opacity: number (optional)

Response:
- clip: the updated clip record

### DELETE /api/clips/[id]

Delete a clip.

Response:
- success: boolean

---

## Testing

### Unit Tests

- Frame/pixel conversion functions
- Clip hit testing (point in rectangle, edge detection)
- Timecode formatting (frames to MM:SS:FF)

### Mission Tests

1. **Clip placement**
   - Create project with timeline
   - Drag image from generate panel to V1 at frame 0
   - Query rewrite_clips: assert 1 row with start_frame=0
   - Assert preview canvas shows the image

2. **Clip move**
   - Create clip at frame 0
   - Drag clip to frame 90 (3 seconds at 30fps)
   - Query rewrite_clips: assert start_frame=90
   - Assert playhead at frame 90 shows the clip

3. **Clip trim**
   - Create clip with duration_frames=150 (5 seconds)
   - Drag right edge to shorten to 90 frames
   - Query rewrite_clips: assert duration_frames=90
   - Play timeline, assert clip ends at correct time

4. **Playback accuracy**
   - Create clip with known video at frame 0
   - Seek to frame 0, capture preview canvas
   - Seek to frame 15, capture preview canvas
   - Assert the two captures are different (video changed)
   - Seek to frame 0, capture again
   - Assert matches first capture (deterministic)
