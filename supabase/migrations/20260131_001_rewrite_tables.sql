-- Creator Studio v2: All rewrite_ tables
-- Run against local Supabase: psql "postgresql://postgres:postgres@localhost:54322/postgres" -f this_file.sql

BEGIN;

-------------------------------------------------------
-- 1. rewrite_projects
-------------------------------------------------------
CREATE TABLE rewrite_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  current_script_id UUID,       -- FK added after rewrite_scripts exists
  current_timeline_id UUID,     -- FK added after rewrite_timelines exists
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 2. rewrite_scripts
-------------------------------------------------------
CREATE TABLE rewrite_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rewrite_projects(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 3. rewrite_assets (before scenes/scene_content which reference it)
-------------------------------------------------------
CREATE TABLE rewrite_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rewrite_projects(id),
  name TEXT,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'audio', 'video')),
  file_url TEXT,
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 4. rewrite_scenes
-------------------------------------------------------
CREATE TABLE rewrite_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES rewrite_scripts(id),
  element_id TEXT UNIQUE NOT NULL,
  scene_number TEXT,
  int_ext TEXT,
  location TEXT,
  time_of_day TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 5. rewrite_scene_content
-------------------------------------------------------
CREATE TABLE rewrite_scene_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES rewrite_scenes(id) ON DELETE CASCADE,
  element_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('action', 'character', 'dialogue', 'parenthetical')),
  content TEXT,
  order_index INTEGER NOT NULL,
  character_name TEXT,
  audio_asset_id UUID REFERENCES rewrite_assets(id),
  audio_status TEXT DEFAULT 'none' CHECK (audio_status IN ('none', 'generating', 'generated', 'stale')),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 6. rewrite_timelines
-------------------------------------------------------
CREATE TABLE rewrite_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rewrite_projects(id),
  name TEXT,
  duration_seconds NUMERIC(10,3) DEFAULT 300,
  frame_rate INTEGER DEFAULT 30,
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 7. rewrite_tracks
-------------------------------------------------------
CREATE TABLE rewrite_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES rewrite_timelines(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('video', 'audio')),
  order_index INTEGER NOT NULL,
  muted BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 8. rewrite_clips
-------------------------------------------------------
CREATE TABLE rewrite_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES rewrite_tracks(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES rewrite_assets(id),
  start_frame INTEGER NOT NULL,
  duration_frames INTEGER NOT NULL,
  offset_frames INTEGER DEFAULT 0,
  name TEXT,
  volume NUMERIC(3,2) DEFAULT 1.0,
  opacity NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------
-- 9. rewrite_characters
-------------------------------------------------------
CREATE TABLE rewrite_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rewrite_projects(id),
  name TEXT NOT NULL,
  voice_id TEXT,
  voice_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, name)
);

-------------------------------------------------------
-- 10. rewrite_traces
-------------------------------------------------------
CREATE TABLE rewrite_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('request_start', 'mutation', 'api_call', 'subscription', 'error')),
  function_name TEXT NOT NULL,
  arguments JSONB,
  result JSONB,
  error TEXT,
  duration_ms INTEGER
);

-------------------------------------------------------
-- Deferred FKs on rewrite_projects
-------------------------------------------------------
ALTER TABLE rewrite_projects
  ADD CONSTRAINT fk_projects_current_script
  FOREIGN KEY (current_script_id) REFERENCES rewrite_scripts(id);

ALTER TABLE rewrite_projects
  ADD CONSTRAINT fk_projects_current_timeline
  FOREIGN KEY (current_timeline_id) REFERENCES rewrite_timelines(id);

-------------------------------------------------------
-- Indexes
-------------------------------------------------------
CREATE INDEX idx_scenes_script_order ON rewrite_scenes(script_id, order_index);
CREATE INDEX idx_scene_content_scene_order ON rewrite_scene_content(scene_id, order_index);
CREATE INDEX idx_tracks_timeline_order ON rewrite_tracks(timeline_id, order_index);
CREATE INDEX idx_clips_track_start ON rewrite_clips(track_id, start_frame);
CREATE INDEX idx_traces_trace_id ON rewrite_traces(trace_id);

-------------------------------------------------------
-- Storage bucket
-------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('rewrite-assets', 'rewrite-assets', true)
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------
-- Realtime (enable on 8 tables, NOT rewrite_traces)
-------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_scripts;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_scene_content;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_timelines;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_clips;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_characters;

COMMIT;
