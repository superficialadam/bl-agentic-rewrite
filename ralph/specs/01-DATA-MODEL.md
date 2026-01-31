# Data Model

Database schema for Creator Studio v2. All tables prefixed with `rewrite_` to avoid conflicts with v1.

---

## Tables

### rewrite_projects

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| name | TEXT | NOT NULL |
| slug | TEXT | UNIQUE, NOT NULL |
| current_script_id | UUID | FK → rewrite_scripts.id, nullable |
| current_timeline_id | UUID | FK → rewrite_timelines.id, nullable |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### rewrite_scripts

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| project_id | UUID | FK → rewrite_projects.id, NOT NULL |
| title | TEXT | |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### rewrite_scenes

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| script_id | UUID | FK → rewrite_scripts.id, NOT NULL |
| element_id | TEXT | UNIQUE, NOT NULL (maps to TipTap node ID) |
| scene_number | TEXT | e.g., "201" |
| int_ext | TEXT | 'INT', 'EXT', or 'INT/EXT' |
| location | TEXT | e.g., "TOMMY & ANNIKAS HUS" |
| time_of_day | TEXT | e.g., "DAG" |
| order_index | INTEGER | NOT NULL |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### rewrite_scene_content

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| scene_id | UUID | FK → rewrite_scenes.id ON DELETE CASCADE, NOT NULL |
| element_id | TEXT | UNIQUE, NOT NULL (maps to TipTap node ID) |
| type | TEXT | NOT NULL: 'action', 'character', 'dialogue', 'parenthetical' |
| content | TEXT | the text content |
| order_index | INTEGER | NOT NULL |
| character_name | TEXT | for dialogue: which character speaks |
| audio_asset_id | UUID | FK → rewrite_assets.id, nullable |
| audio_status | TEXT | 'none', 'generating', 'generated', 'stale' — default 'none' |
| content_hash | TEXT | SHA-256 of content, for stale detection |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### rewrite_timelines

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| project_id | UUID | FK → rewrite_projects.id, NOT NULL |
| name | TEXT | |
| duration_seconds | NUMERIC(10,3) | default 300 |
| frame_rate | INTEGER | default 30 |
| width | INTEGER | default 1920 |
| height | INTEGER | default 1080 |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### rewrite_tracks

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| timeline_id | UUID | FK → rewrite_timelines.id ON DELETE CASCADE, NOT NULL |
| name | TEXT | e.g., "V1", "A1" |
| type | TEXT | NOT NULL: 'video', 'audio' |
| order_index | INTEGER | NOT NULL |
| muted | BOOLEAN | default false |
| hidden | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | default now() |

### rewrite_clips

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| track_id | UUID | FK → rewrite_tracks.id ON DELETE CASCADE, NOT NULL |
| asset_id | UUID | FK → rewrite_assets.id, nullable |
| start_frame | INTEGER | NOT NULL (position on timeline) |
| duration_frames | INTEGER | NOT NULL (length) |
| offset_frames | INTEGER | default 0 (offset into source asset) |
| name | TEXT | |
| volume | NUMERIC(3,2) | default 1.0 (for audio clips) |
| opacity | NUMERIC(3,2) | default 1.0 (for video clips) |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### rewrite_assets

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| project_id | UUID | FK → rewrite_projects.id, NOT NULL |
| name | TEXT | |
| file_type | TEXT | NOT NULL: 'image', 'audio', 'video' |
| file_url | TEXT | Supabase storage URL |
| duration_ms | INTEGER | for audio/video |
| width | INTEGER | for images/video |
| height | INTEGER | for images/video |
| metadata | JSONB | flexible metadata |
| created_at | TIMESTAMPTZ | default now() |

### rewrite_characters

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| project_id | UUID | FK → rewrite_projects.id, NOT NULL |
| name | TEXT | NOT NULL, e.g., "BERÄTTARRÖST" |
| voice_id | TEXT | ElevenLabs voice ID |
| voice_settings | JSONB | stability, similarity_boost, style, use_speaker_boost |
| created_at | TIMESTAMPTZ | default now() |

UNIQUE constraint on (project_id, name) — one character per name per project.

### rewrite_traces

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, default gen_random_uuid() |
| trace_id | UUID | NOT NULL (groups events in one request) |
| timestamp | TIMESTAMPTZ | default now() |
| event_type | TEXT | NOT NULL: 'request_start', 'mutation', 'api_call', 'subscription', 'error' |
| function_name | TEXT | NOT NULL |
| arguments | JSONB | |
| result | JSONB | |
| error | TEXT | |
| duration_ms | INTEGER | |

Index on trace_id for grouping queries.

---

## Realtime

Enable Supabase Realtime on these tables:
- rewrite_scripts
- rewrite_scenes
- rewrite_scene_content
- rewrite_timelines
- rewrite_tracks
- rewrite_clips
- rewrite_assets
- rewrite_characters

Do NOT enable realtime on rewrite_traces (high write volume).

---

## Storage Buckets

**rewrite-assets** — For uploaded and generated media files.

Path convention: `{project_id}/{file_type}/{asset_id}/{filename}`

Example: `abc123/image/def456/generated-shot.png`

---

## Indexes

Create indexes for common query patterns:
- rewrite_scenes: (script_id, order_index)
- rewrite_scene_content: (scene_id, order_index)
- rewrite_tracks: (timeline_id, order_index)
- rewrite_clips: (track_id, start_frame)
- rewrite_traces: (trace_id)
