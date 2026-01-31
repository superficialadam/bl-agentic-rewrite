# Create Flow API Routes

Comprehensive documentation of all API routes used by the `/create` flow in the Blenda platform.

## Table of Contents
1. [Direct API Routes (fetch calls)](#direct-api-routes-fetch-calls)
2. [Form Action API Routes (useFetcher)](#form-action-api-routes-usefetcher)
3. [Supporting API Routes](#supporting-api-routes)

---

## Direct API Routes (fetch calls)

These routes are called directly via `fetch()` from the create route frontend.

### 1. `/api/dialogue/generate`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.dialogue.generate.tsx`

**Method:** POST

**Purpose:** Generate or replace dialogue audio for a script element using ElevenLabs

**Request Body:**
```typescript
{
  brandId: string;
  projectId: string;
  scriptAssetId: string;
  scriptVersionId: string;
  elementId: string;
  dialogueText: string;
  characterId: string;
  characterName: string;
  voiceId: string;
  voiceName: string;
  locale?: string;
  scriptOriginalLocale?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  audioUrl?: string;
  assetId?: string;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Validates required parameters
- Calls `generateOrReplaceDialogueAudio` service
- Creates audio asset for dialogue
- Returns audio URL and asset ID

---

### 2. `/api/assets/collections`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.collections.tsx`

**Methods:** POST, PATCH, DELETE

**Purpose:** CRUD operations for asset collections (character, environment, prop, general)

#### POST - Create Collection
**Request Body:**
```typescript
{
  name: string;
  type?: 'character' | 'environment' | 'prop' | 'general';
  description?: string;
  brandId: string;
  assetId?: string; // If provided, analyzes asset to populate collection metadata
}
```

**Response:**
```typescript
{
  success: boolean;
  collection?: {
    id: string;
    name: string;
    type: string;
    description: string | null;
  };
  error?: string;
}
```

#### PATCH - Update Collection
**Request Body:**
```typescript
{
  collectionId: string;
  coverAssetId?: string | null;
  name?: string;
  type?: string;
  description?: string;
  metadata?: Json; // Used to save voice settings for character collections
}
```

**Response:**
```typescript
{
  success: boolean;
  collection?: {
    id: string;
    name: string;
    type: string;
    description: string | null;
  };
  error?: string;
}
```

**Usage in create flow:**
- PATCH is used to save character voice settings to collection metadata
- Called when character voice settings are updated

#### DELETE - Delete Collection
**Request Body:**
```typescript
{
  collectionId: string;
  deleteAssets?: boolean; // If true, deletes all assets in collection
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- POST: Creates new collection, optionally analyzes asset for metadata
- PATCH: Updates collection properties, syncs to pending AI review jobs
- DELETE: Deletes collection, optionally deletes assets, updates AI review jobs

---

## Form Action API Routes (useFetcher)

These routes are called via React Router's `useFetcher()` mechanism, submitting form data to the create route's action handler.

### Create Route Action Handler
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/_in.$brandSlug.$projectSlug.create.tsx`

The create route itself handles multiple intents via its action function. All requests go to the same route but are differentiated by the `intent` or `action` form field.

#### Intent: `save-script`
**Handler:** `handleSaveScript`

**Form Data:**
```typescript
{
  intent: 'save-script';
  scriptAssetId: string;
  tiptapJson: string; // JSON stringified TipTap document
}
```

**What it does:**
- Saves script content (TipTap JSON) to asset_versions table
- Creates new version record with updated content
- Updates asset metadata

---

#### Intent: `create-scene-timeline`
**Handler:** `handleCreateSceneTimeline`

**Form Data:**
```typescript
{
  intent: 'create-scene-timeline';
  sceneId: string;
  locale?: string | null;
}
```

**What it does:**
- Creates timeline asset for a specific scene
- Processes dialogue elements
- Generates timeline clips
- Returns timeline asset ID

---

#### Intent: `update-scene-timeline-audio`
**Handler:** `handleUpdateSceneTimelineAudio`

**Form Data:**
```typescript
{
  intent: 'update-scene-timeline-audio';
  sceneId: string;
  locale?: string | null;
}
```

**What it does:**
- Updates audio clips in existing scene timeline
- Re-generates audio for dialogue elements
- Maintains timeline structure

---

#### Intent: `reset-scene-timeline`
**Handler:** `handleResetSceneTimeline`

**Form Data:**
```typescript
{
  intent: 'reset-scene-timeline';
  sceneId: string;
  locale?: string | null;
}
```

**What it does:**
- Deletes existing timeline for scene
- Creates fresh timeline from scratch
- Useful for rebuilding timeline after script changes

---

#### Intent: `create-all-scene-timelines`
**Handler:** `handleCreateAllSceneTimelines`

**Form Data:**
```typescript
{
  intent: 'create-all-scene-timelines';
  scriptAssetId: string;
}
```

**What it does:**
- Batch creates timelines for all scenes in script
- Processes each scene sequentially
- Returns success status for all timelines

---

#### Intent: `create-shot-nodes`
**Handler:** `handleCreateShotNodes`

**Form Data:**
```typescript
{
  intent: 'create-shot-nodes';
  // Shot node data
}
```

**What it does:**
- Creates workflow shot nodes
- Used in storyboard/workflow view

---

#### Intent: `update-shot-node`
**Handler:** `handleUpdateShotNode`

**Form Data:**
```typescript
{
  intent: 'update-shot-node';
  // Shot node update data
}
```

**What it does:**
- Updates existing workflow shot node
- Modifies node properties

---

#### Intent: `delete-shot-nodes`
**Handler:** `handleDeleteShotNodes`

**Form Data:**
```typescript
{
  intent: 'delete-shot-nodes';
  // Shot node IDs
}
```

**What it does:**
- Deletes workflow shot nodes
- Cleans up related data

---

#### Intent: `process-shot`
**Handler:** `handleProcessShot`

**Form Data:**
```typescript
{
  intent: 'process-shot';
  // Shot processing data
}
```

**What it does:**
- Processes/generates shot content
- Likely triggers GenAI workflow

---

#### Intent: `load-timeline`
**Handler:** `handleLoadTimeline`

**Form Data:**
```typescript
{
  intent: 'load-timeline';
  // Timeline load parameters
}
```

**What it does:**
- Loads timeline data
- Returns timeline structure

---

#### Action: `save-script`
**Handler:** `handleSaveScript` (same as intent)

**Form Data:**
```typescript
{
  action: 'save-script';
  scriptAssetId: string;
  tiptapJson: string;
}
```

**What it does:**
- Alternative action type for script saving
- Used by SaveButton component
- Same functionality as intent: save-script

---

#### Action: `list-script-versions`
**Handler:** `handleListScriptVersions`

**Form Data:**
```typescript
{
  action: 'list-script-versions';
  // Version list parameters
}
```

**What it does:**
- Lists available script versions
- Returns version history

---

#### Action: `create-script-version`
**Handler:** `handleCreateScriptVersion`

**Form Data:**
```typescript
{
  action: 'create-script-version';
  // Version creation data
}
```

**What it does:**
- Creates new script version
- Version management

---

#### Action: `restore-script-version`
**Handler:** `handleRestoreScriptVersion`

**Form Data:**
```typescript
{
  action: 'restore-script-version';
  // Version restore data
}
```

**What it does:**
- Restores previous script version
- Version rollback

---

#### Action: `translate-dialogue`
**Handler:** `handleTranslateDialogue`

**Form Data:**
```typescript
{
  action: 'translate-dialogue';
  // Translation parameters
}
```

**What it does:**
- Translates dialogue to different locale
- Manages multi-language script versions

---

#### Action: `set-script-default-locale`
**Handler:** `handleSetScriptDefaultLocale`

**Form Data:**
```typescript
{
  action: 'set-script-default-locale';
  // Locale setting data
}
```

**What it does:**
- Sets default locale for script
- Locale management

---

## Supporting API Routes

These routes are not directly called by the create route but are related to the create flow functionality.

### 1. `/api/workflow/generate`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.workflow.generate.tsx`

**Method:** POST

**Purpose:** Generate content using GenAI models (synchronous)

**Request Body:**
```typescript
{
  nodeId: string;
  nodeData: any;
  modelConfig: GenAIModelConfig;
  workflowId?: string;
  templateId?: string;
  shotId?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  outputUrl?: string;
  assetType?: string;
  error?: string;
}
```

**What it does:**
- Runs GenAI prediction synchronously (timeout 300s)
- Supports multiple providers (Replicate, FAL, etc.)
- Downloads external URLs and uploads to Supabase storage
- Returns final asset URL and type

---

### 2. `/api/workflow/prompt-enhancer`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.workflow.prompt-enhancer.tsx`

**Method:** POST

**Purpose:** Analyze text to find collection references and generate enhanced prompts

**Request Body:**
```typescript
{
  text: string;
  brandId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  // Enhanced prompt data
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Analyzes text input for collection references
- Generates enhanced prompts using collection metadata
- Used in workflow/storyboard generation

---

### 3. `/api/script/auto-tag`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.script.auto-tag.tsx`

**Method:** POST

**Purpose:** Classify untagged script paragraphs using OpenAI

**Request Body:**
```typescript
{
  paragraphs: string[];
  previousTypes?: Array<string | null>;
}
```

**Response:**
```typescript
{
  success: boolean;
  classifications?: Array<any>;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Uses OpenAI to classify script paragraph types
- Returns array of classifications for each paragraph
- Used in script editor for auto-tagging

---

### 4. `/api/search/assets`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.search.assets.tsx`

**Method:** GET

**Purpose:** Fast, faceted asset search with full-text and semantic search

**Query Parameters:**
```typescript
{
  brand_id: string; // required
  project_id?: string;
  q?: string; // search query
  asset_type?: 'image' | 'video' | 'audio' | 'document';
  tag_ids?: string; // comma-separated
  collection_ids?: string; // comma-separated
  created_by?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  sort?: 'relevance' | 'updated_at' | 'created_at' | 'name';
  order?: 'asc' | 'desc';
  limit?: number; // max 200
  debug?: 'true' | 'false';
}
```

**Response:**
```typescript
{
  items: Array<{
    asset_id: string;
    name: string;
    description: string;
    asset_type: string;
    created_at: string;
    updated_at: string;
    thumb_sm_url: string;
    thumb_lg_url: string;
    thumb_blurhash: string;
    width: number;
    height: number;
    duration_ms: number;
    file_size: number;
    mime_type: string;
    tag_ids: string[];
    tag_names: string[];
    tags_by_group: Record<string, any>;
    collection_ids: string[];
    collection_names: string[];
    latest_version_number: number;
    latest_version_id: string;
    latest_file_url: string;
    has_audio: boolean;
    has_transcript: boolean;
    relevance_score?: number;
    debug_info?: any;
  }>;
  next_cursor: string | null;
  debug?: any;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Performs hybrid search using semantic embeddings + text search
- Supports filtering by tags, collections, types, dates
- Uses PostgreSQL RPC `search_assets_smart` for advanced search
- Returns ranked results with relevance scores

---

### 5. `/api/assets/create`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.create.tsx`

**Method:** POST

**Purpose:** Create asset record without uploading file (for client-side uploads)

**Form Data:**
```typescript
{
  brandId: string;
  name?: string;
  description?: string;
  mimeType: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  asset?: {
    id: string;
    name: string;
    file_type: string;
    brand_id: string;
  };
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Creates asset record with status 'processing'
- Used for client-side upload workflows
- Detects file type from MIME type

---

### 6. `/api/assets/upload`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.upload.tsx`

**Method:** POST

**Purpose:** Multipart file upload for asset management

**Form Data:**
```typescript
{
  file: File;
  brandId: string;
  collectionId?: string;
  name?: string;
  description?: string;
  tags?: string; // JSON array
}
```

**Response:**
```typescript
{
  success: boolean;
  asset?: {
    id: string;
    name: string;
    file_type: string;
    status: string;
    url: string;
  };
  version?: {
    id: string;
    version_number: number;
  };
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Handles multipart file uploads
- Creates asset and version records
- Adds to collection (or "Recently added" collection)
- Queues thumbnail generation job
- Parses and creates tags

---

### 7. `/api/assets/create-from-storage`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.create-from-storage.tsx`

**Method:** POST

**Purpose:** Create asset from file already uploaded to Supabase Storage

**Form Data:**
```typescript
{
  storagePath: string;
  brandId: string;
  collectionId?: string;
  name?: string;
  description?: string;
  tags?: string; // JSON array
  fileSize?: string;
  mimeType: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  asset?: {
    id: string;
    name: string;
    file_type: string;
    status: string;
    url: string;
  };
  version?: {
    id: string;
    version_number: number;
  };
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Creates asset from pre-uploaded storage file
- Moves file to correct storage path if needed
- Creates version record with locale 'sv' (default)
- Adds to collection and tags
- Queues thumbnail generation

---

### 8. `/api/assets/create-version`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.create-version.tsx`

**Method:** POST

**Purpose:** Create version record for existing asset

**Form Data:**
```typescript
{
  assetId: string;
  storagePath: string;
  fileSize?: string;
  mimeType: string;
  collectionId?: string;
  tags?: string; // JSON array
}
```

**Response:**
```typescript
{
  success: boolean;
  asset?: {
    id: string;
    name: string;
    file_type: string;
    status: string;
    url: string;
  };
  version?: {
    id: string;
    version_number: number;
  };
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Creates new version for existing asset
- Updates locale-aware version tracking
- Adds to collection if specified
- Creates/assigns tags
- Queues thumbnail generation

---

### 9. `/api/assets/bulk-update`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.bulk-update.tsx`

**Method:** POST

**Purpose:** Bulk update multiple assets (collection, tags, description)

**Request Body:**
```typescript
{
  assetIds: string[];
  collectionId?: string;
  tagIds?: string[];
  tagIdsToRemove?: string[];
  description?: string;
  assetTagRemovals?: Array<{
    assetId: string;
    tagId: string;
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  updated?: number;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Updates multiple assets at once
- Moves assets to collection
- Adds/removes tags in bulk
- Updates descriptions
- Uses service role client for privileged operations

---

### 10. `/api/assets/ai-review`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.assets.ai-review.tsx`

**Method:** POST

**Purpose:** Approve/reject AI-generated tag and collection suggestions

**Request Body:**
```typescript
{
  reviewId: string;
  action: 'approve_all' | 'reject_all' | 'approve_tags' | 'reject_tags' | 'approve_collection' | 'reject_collection';
  tagSuggestionIds?: string[];
  collectionSuggestionId?: string;
  editedCollectionId?: string;
  editedCollectionName?: string;
  editedCollectionType?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Processes AI review approval/rejection
- Creates collections from approved suggestions
- Applies tags to assets
- Updates asset collection assignments
- Analyzes assets for collection metadata
- Manages review job status

---

### 11. `/api/elevenlabs/voices`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.elevenlabs.voices.tsx`

**Method:** GET

**Purpose:** Fetch all available voices from user's ElevenLabs account

**Response:**
```typescript
{
  success: boolean;
  voices?: Array<any>;
  error?: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Fetches voices from ElevenLabs API
- Returns voice list for dialogue generation

---

### 12. `/api/elevenlabs/dialogue`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.elevenlabs.dialogue.tsx`

**Method:** POST

**Purpose:** Generate speech from text using specific voice

**Request Body:**
```typescript
{
  text: string;
  voiceId: string;
  languageCode?: string;
}
```

**Response:** Binary audio data (audio/mpeg)

**Auth:** Required (requireAuthWithClient)

**What it does:**
- Calls ElevenLabs text-to-dialogue API
- Returns MP3 audio buffer
- Used for direct dialogue generation

---

### 13. `/api/export/timeline-editor/$timelineAssetId`
**File:** `/Users/adamwittsell/CODE/BlendaLabs/blenda-platform/app/routes/api.export.timeline-editor.$timelineAssetId.tsx`

**Methods:** GET, POST

**Purpose:** Create and check timeline export jobs

#### GET - Check Export Status
**Query Parameters:**
```typescript
{
  jobId?: string; // optional, returns most recent if omitted
}
```

**Response:**
```typescript
{
  jobId: string | null;
  status: 'none' | 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  exportUrl?: string | null;
  exportFileName?: string | null;
  exportSizeBytes?: number | null;
  errorMessage?: string | null;
  createdAt?: string;
}
```

#### POST - Create Export Job
**Response:**
```typescript
{
  success: boolean;
  jobId: string;
  message: string;
}
```

**Auth:** Required (requireAuthWithClient)

**What it does:**
- GET: Checks status of timeline export job
- POST: Creates new export job for timeline
- Returns download URL when export is completed
- Prevents duplicate exports (checks for existing queued/processing jobs)

---

## Summary

The create flow uses a combination of:

1. **Direct API routes** (2 routes):
   - `/api/dialogue/generate` - Generate dialogue audio
   - `/api/assets/collections` - Manage collections and save voice settings

2. **Form action handlers** (15+ intents/actions):
   - Script operations: save, version management, translation
   - Timeline operations: create, update, reset for scenes
   - Shot/workflow operations: create, update, delete, process nodes
   - All handled by the create route's action function

3. **Supporting API routes** (13 routes):
   - Asset management: upload, create, version, bulk update, search
   - AI features: auto-tag, AI review, prompt enhancer
   - GenAI: workflow generation
   - Audio: ElevenLabs voices and dialogue generation
   - Export: timeline export jobs

Total: **30+ API endpoints** used directly or indirectly by the create flow.

## Authentication Pattern

All routes use `requireAuthWithClient()` which:
- Validates user session
- Returns authenticated Supabase client
- Throws 401 if not authenticated

## Authorization Pattern

Most routes verify brand access via:
1. Get user's team IDs from `team_members`
2. Check `brands_teams` junction table
3. Verify user's team has access to brand
4. Return 403 if access denied

## Common Response Patterns

Success:
```typescript
{
  success: true;
  // ... data
}
```

Error:
```typescript
{
  success: false;
  error: string;
}
// OR
{
  error: string;
}
```

## Notes

- Many routes use service role client for privileged operations
- Collection metadata includes AI-analyzed properties (visual, semantic, keywords)
- Timeline operations are locale-aware (default: 'sv')
- Asset creation queues background jobs for thumbnail generation
- Search uses hybrid semantic + text search with OpenAI embeddings
