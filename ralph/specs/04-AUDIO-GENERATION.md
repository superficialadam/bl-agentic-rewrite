# Audio Generation

Text-to-speech generation for dialogue using ElevenLabs.

**Prerequisites:** Read 00-FOUNDATIONS.md and 01-DATA-MODEL.md first.

---

## Overview

Dialogue lines in the script can be converted to audio using ElevenLabs TTS. Each character has an assigned voice. Generated audio becomes an asset that can be placed on the timeline.

---

## Trigger Points

Audio generation is triggered in two ways:

### Play Button

Next to each dialogue line in the script editor, show a play button.

On click:
1. Check audio_status of the scene_content record
2. If 'generated' and content unchanged (hash matches) → play existing audio
3. Otherwise → generate new audio, then play

### Drag to Timeline

When dragging a dialogue line to an audio track:

1. Check if audio exists and is current
2. If yes → create clip with existing asset
3. If no → show loading indicator, generate audio, then create clip

---

## Generation Flow

### 1. Validate

- Confirm scene_content record exists
- Confirm character has voice_id assigned
- If no voice assigned, show error: "Assign a voice to [CHARACTER] first"

### 2. Update Status

Set rewrite_scene_content.audio_status = 'generating'

This triggers UI update (pulsing yellow indicator).

### 3. Call ElevenLabs API

POST to /api/generate/audio with:
- text: the dialogue content
- voice_id: from rewrite_characters
- voice_settings: from rewrite_characters (or defaults)

Server-side:
1. Call ElevenLabs text-to-speech endpoint
2. Receive audio data (MP3)
3. Upload to Supabase storage bucket 'rewrite-assets'
4. Create rewrite_assets record with file_type='audio'
5. Return asset_id and duration_ms

### 4. Update Records

Update rewrite_scene_content:
- audio_asset_id = new asset ID
- audio_status = 'generated'
- content_hash = SHA256(content)

### 5. Return Result

Return to client:
- asset_id
- file_url (for immediate playback)
- duration_ms

---

## Voice Settings

Each character can have custom voice settings stored in rewrite_characters.voice_settings:

| Setting | Type | Range | Default | Purpose |
|---------|------|-------|---------|---------|
| stability | number | 0-1 | 0.5 | Higher = more consistent, lower = more expressive |
| similarity_boost | number | 0-1 | 0.75 | Higher = closer to original voice |
| style | number | 0-1 | 0.0 | Style exaggeration (v2 voices only) |
| use_speaker_boost | boolean | - | true | Enhance speaker clarity |

If voice_settings is null, use defaults.

---

## Stale Detection

Audio becomes stale when dialogue text changes after generation.

### On Generation

Store content_hash = SHA256(content) in rewrite_scene_content.

### On Load / Subscription Update

Compare stored content_hash with SHA256(current content):
- Match → status is 'generated' (green)
- Mismatch → status is 'stale' (yellow)

### Regeneration

When user clicks play on stale audio:
1. Regenerate with new content
2. Update audio_asset_id to new asset
3. Update content_hash

Old asset remains in storage (not deleted) for potential rollback.

---

## Batch Regeneration

Character panel has "Regenerate All" button per character.

On click:
1. Find all rewrite_scene_content where character_name = selected character
2. For each, set audio_status = 'generating'
3. Queue generation for each (sequential to avoid rate limits)
4. Update each as completed

Show progress: "Generating 3 of 7..."

---

## API Endpoint

### POST /api/generate/audio

Request:
- text: string (the dialogue to speak)
- voice_id: string (ElevenLabs voice ID)
- voice_settings: object (optional, uses defaults if omitted)
  - stability: number
  - similarity_boost: number
  - style: number
  - use_speaker_boost: boolean

Server processing:
1. Validate inputs
2. Call ElevenLabs API:
   - Endpoint: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
   - Headers: xi-api-key
   - Body: { text, model_id: "eleven_multilingual_v2", voice_settings }
3. Receive audio stream
4. Upload to Supabase storage
5. Create rewrite_assets record
6. Trace the operation

Response:
- asset_id: UUID
- file_url: string (Supabase storage URL)
- duration_ms: number

Error response:
- error: string
- code: string (e.g., 'NO_VOICE_ASSIGNED', 'ELEVENLABS_ERROR', 'UPLOAD_FAILED')

---

## Voice List

### GET /api/voices

Returns available ElevenLabs voices.

Server processing:
1. Call ElevenLabs API: GET https://api.elevenlabs.io/v1/voices
2. Filter to relevant voices (premade + user cloned)
3. Cache for 1 hour (voices don't change often)

Response:
- voices: array of { voice_id, name, category, labels }

---

## Playing Audio

### In Script Editor

When play button clicked and audio exists:
1. Create Audio element with file_url
2. Play audio
3. Show playing indicator on dialogue line
4. On ended, reset indicator

### In Timeline

Audio clips are played by the timeline playback engine (see 03-TIMELINE-EDITOR.md).

---

## Error Handling

| Error | Handling |
|-------|----------|
| No voice assigned | Show inline error, prompt to assign voice |
| ElevenLabs rate limit | Queue retry with backoff, show "Rate limited, retrying..." |
| ElevenLabs API error | Show error toast, set audio_status = 'none', log to traces |
| Upload failed | Retry once, then show error, set audio_status = 'none' |
| Network error | Show "Network error, please try again" |

All errors are traced with full context.

---

## Testing

### Unit Tests

- SHA256 hash function consistency
- Voice settings defaults application
- Audio status derivation logic

### Mission Tests

1. **Generate dialogue audio**
   - Create script with character ANNA
   - Assign voice to ANNA (use a known test voice_id)
   - Add dialogue "Hello, world."
   - Click play button
   - Wait for generation
   - Query rewrite_assets: assert audio asset exists
   - Query rewrite_scene_content: assert audio_asset_id set, audio_status='generated'
   - Assert audio plays (check Audio element state)

2. **Stale detection**
   - Generate audio for dialogue "Hello"
   - Note the content_hash
   - Edit dialogue to "Goodbye"
   - Assert status indicator shows yellow (stale)
   - Query rewrite_scene_content: assert audio_status='stale' or content_hash mismatch

3. **Drag to timeline**
   - Generate audio for dialogue
   - Drag dialogue line to A1 track
   - Query rewrite_clips: assert clip exists with correct asset_id
   - Play timeline, assert audio is heard at clip position
