# Script Editor

The script editor allows writing and editing screenplays with structured data persistence.

**Prerequisites:** Read 00-FOUNDATIONS.md and 01-DATA-MODEL.md first.

---

## Overview

The script editor has three panels:
- **Outliner** (left): Tree view of scenes
- **Editor** (center): TipTap rich text editor with screenplay formatting
- **Character Panel** (right): Characters detected from script with voice assignment

---

## TipTap Setup

Use TipTap directly (not svelte-tiptap wrapper). Official Svelte 5 docs show the pattern with `$state()` and `onMount`.

Required packages:
- @tiptap/core
- @tiptap/pm
- @tiptap/starter-kit

---

## Custom Node Types

Create TipTap extensions for screenplay elements. Each node type maps to database records.

### sceneHeading

Parses format: "201. INT. LOCATION - TIME" or "201. EXT. LOCATION - DAG"

Maps to: rewrite_scenes table

Attributes:
- element_id (generated UUID, stored in TipTap node)
- scene_number (parsed from text)
- int_ext (parsed: INT, EXT, or INT/EXT)
- location (parsed)
- time_of_day (parsed)

Rendering: Bold, all caps, with scene number prefix.

### action

Plain paragraph for scene descriptions.

Maps to: rewrite_scene_content with type='action'

Attributes:
- element_id (generated UUID)

Rendering: Normal paragraph.

### character

Character name line before dialogue.

Maps to: rewrite_scene_content with type='character'

Attributes:
- element_id (generated UUID)
- character_name (the text content, normalized to uppercase)

Rendering: Centered, all caps.

Side effect: When created, check if character exists in rewrite_characters. If not, create character record.

### dialogue

Dialogue text spoken by preceding character.

Maps to: rewrite_scene_content with type='dialogue'

Attributes:
- element_id (generated UUID)
- character_name (copied from preceding character node)

Rendering: Indented from both margins.

### parenthetical

Performance direction in parentheses.

Maps to: rewrite_scene_content with type='parenthetical'

Attributes:
- element_id (generated UUID)

Rendering: Indented, in parentheses.

---

## Persistence Flow

### On Edit (debounced)

1. User types in TipTap
2. TipTap document state updates (ephemeral)
3. Start/reset 1-second debounce timer
4. After debounce, call syncToDatabase()

### syncToDatabase()

1. Get TipTap JSON document
2. Walk the document tree
3. For each sceneHeading node:
   - Parse the text to extract scene_number, int_ext, location, time_of_day
   - Upsert to rewrite_scenes using element_id as key
4. Track current scene_id as we walk
5. For each action/character/dialogue/parenthetical node:
   - Upsert to rewrite_scene_content using element_id as key
   - Set scene_id to current scene
   - For dialogue, copy character_name from preceding character node
6. Delete orphaned records (element_ids in DB but not in document)

### On Load

1. Fetch script by ID
2. Fetch all scenes for script, ordered by order_index
3. Fetch all scene_content for those scenes, ordered by order_index
4. Reconstruct TipTap document from database records
5. Initialize TipTap editor with reconstructed document

**Database is authoritative.** On load, always reconstruct from DB, never from localStorage or cached state.

---

## Character Detection

When a character node is created or its text changes:

1. Normalize name to uppercase, trim whitespace
2. Query rewrite_characters for (project_id, name)
3. If not found, insert new character record with:
   - project_id from current project
   - name (normalized)
   - voice_id = null (unassigned)
   - voice_settings = null

Characters panel subscribes to rewrite_characters and shows all characters for the project.

---

## Audio Status Indicators

Dialogue nodes show a status indicator dot:

| Status | Color | Meaning |
|--------|-------|---------|
| none | Red | No audio generated |
| generating | Yellow (pulsing) | Generation in progress |
| generated | Green | Audio is current |
| stale | Yellow | Content changed since generation |

Derive status from rewrite_scene_content:
- audio_asset_id is null → 'none'
- audio_status = 'generating' → 'generating'
- content_hash !== SHA256(content) → 'stale'
- Otherwise → 'generated'

---

## Outliner

Left panel showing scene hierarchy.

### Display

List of scenes from rewrite_scenes, ordered by order_index:
- Show scene_number and location
- e.g., "201. TOMMY & ANNIKAS HUS"

### Interaction

- Click scene → scroll editor to that scene heading
- Scenes update in realtime via Supabase subscription

---

## Character Panel

Right panel showing characters and voice assignment.

### Display

List of characters from rewrite_characters for current project:
- Character name
- Assigned voice (or "No voice assigned")
- Count of dialogue lines

### Voice Assignment

Dropdown to select ElevenLabs voice:
- Fetch available voices from /api/voices endpoint
- On selection, update rewrite_characters.voice_id and voice_settings

### Regenerate All

Button to regenerate audio for all dialogue by this character:
- Find all rewrite_scene_content where character_name matches
- Set audio_status = 'generating' for each
- Queue audio generation for each (see 04-AUDIO-GENERATION.md)

---

## API Endpoints

### GET /api/scripts/[id]

Returns script with all scenes and content.

Response shape:
- script: { id, project_id, title }
- scenes: array of { id, element_id, scene_number, int_ext, location, time_of_day, order_index, content: [] }
- Each scene.content is array of { id, element_id, type, content, character_name, audio_status }

### POST /api/scripts/[id]/sync

Receives TipTap document JSON, syncs to database.

Request body:
- document: TipTap JSON

Response:
- success: boolean
- scenes_upserted: number
- content_upserted: number
- orphans_deleted: number

All operations are traced.

---

## Testing

### Unit Tests

- Scene heading parser: verify extraction of scene_number, int_ext, location, time_of_day from various formats
- Document-to-records mapper: verify TipTap JSON produces correct scene and content records
- Records-to-document mapper: verify database records reconstruct correct TipTap JSON

### Mission Tests

1. **Script sync roundtrip**
   - Create project
   - Open script editor
   - Type scene heading: "201. INT. KITCHEN - DAY"
   - Type action: "John enters the room."
   - Type character: "JOHN"
   - Type dialogue: "Hello, world."
   - Wait for autosave (1 second debounce + network)
   - Query rewrite_scenes: assert 1 row with location='KITCHEN'
   - Query rewrite_scene_content: assert 3 rows (action, character, dialogue)
   - Reload page
   - Assert editor content matches what was typed

2. **Character detection**
   - Type character name "MARY" in editor
   - Wait for sync
   - Query rewrite_characters: assert row exists with name='MARY'
   - Check character panel shows MARY

3. **Orphan cleanup**
   - Create scene with dialogue
   - Wait for sync
   - Delete the dialogue in editor
   - Wait for sync
   - Query rewrite_scene_content: assert dialogue row is deleted
