import { test, expect } from '@playwright/test';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const EXPECTED_TABLES = [
	'rewrite_projects',
	'rewrite_scripts',
	'rewrite_scenes',
	'rewrite_scene_content',
	'rewrite_timelines',
	'rewrite_tracks',
	'rewrite_clips',
	'rewrite_assets',
	'rewrite_characters',
	'rewrite_traces'
];

const EXPECTED_INDEXES = [
	'idx_scenes_script_order',
	'idx_scene_content_scene_order',
	'idx_tracks_timeline_order',
	'idx_clips_track_start',
	'idx_traces_trace_id'
];

const REALTIME_TABLES = [
	'rewrite_scripts',
	'rewrite_scenes',
	'rewrite_scene_content',
	'rewrite_timelines',
	'rewrite_tracks',
	'rewrite_clips',
	'rewrite_assets',
	'rewrite_characters'
];

test.describe('Database Schema', () => {
	async function psql(query: string): Promise<string> {
		const { execSync } = await import('child_process');
		return execSync(`psql "${DB_URL}" -t -A -q -c "${query}"`, { encoding: 'utf-8' }).trim();
	}

	test('all 10 rewrite_ tables exist', async () => {
		const result = await psql(
			"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'rewrite_%' ORDER BY table_name"
		);
		const tables = result.split('\n').filter(Boolean);
		expect(tables).toEqual(EXPECTED_TABLES.sort());
	});

	test('rewrite_scene_content has all required columns', async () => {
		const result = await psql(
			"SELECT column_name FROM information_schema.columns WHERE table_name='rewrite_scene_content' ORDER BY ordinal_position"
		);
		const columns = result.split('\n').filter(Boolean);
		expect(columns).toContain('scene_id');
		expect(columns).toContain('element_id');
		expect(columns).toContain('type');
		expect(columns).toContain('content');
		expect(columns).toContain('order_index');
		expect(columns).toContain('character_name');
		expect(columns).toContain('audio_asset_id');
		expect(columns).toContain('audio_status');
		expect(columns).toContain('content_hash');
	});

	test('rewrite_characters has unique constraint on (project_id, name)', async () => {
		const result = await psql(
			"SELECT indexname FROM pg_indexes WHERE tablename='rewrite_characters' AND indexname LIKE '%project_id_name%'"
		);
		expect(result).toContain('project_id_name');
	});

	test('all performance indexes exist', async () => {
		const result = await psql(
			"SELECT indexname FROM pg_indexes WHERE tablename LIKE 'rewrite_%' ORDER BY indexname"
		);
		const indexes = result.split('\n').filter(Boolean);
		for (const idx of EXPECTED_INDEXES) {
			expect(indexes).toContain(idx);
		}
	});

	test('realtime enabled on 8 tables (not traces)', async () => {
		const result = await psql(
			"SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename LIKE 'rewrite_%' ORDER BY tablename"
		);
		const tables = result.split('\n').filter(Boolean);
		expect(tables).toEqual(REALTIME_TABLES.sort());
		expect(tables).not.toContain('rewrite_traces');
	});

	test('storage bucket rewrite-assets exists', async () => {
		const result = await psql("SELECT name FROM storage.buckets WHERE id='rewrite-assets'");
		expect(result).toBe('rewrite-assets');
	});

	test('CRUD: insert and cascade delete through FK chain', async () => {
		const slug = `_test_schema_${Date.now()}`;
		// Clean up any stale test data first
		await psql(`DELETE FROM rewrite_projects WHERE slug LIKE '_test_schema_%'`).catch(() => {});

		// Insert project → script → scene → content
		const projectId = await psql(
			`INSERT INTO rewrite_projects (name, slug) VALUES ('${slug}', '${slug}') RETURNING id`
		);
		expect(projectId).toMatch(/^[0-9a-f-]{36}$/);

		try {
			const scriptId = await psql(
				`INSERT INTO rewrite_scripts (project_id, title) VALUES ('${projectId}', 'Test') RETURNING id`
			);

			const elemId = `_test_elem_${Date.now()}`;
			const sceneId = await psql(
				`INSERT INTO rewrite_scenes (script_id, element_id, scene_number, order_index) VALUES ('${scriptId}', '${elemId}', '1', 0) RETURNING id`
			);

			const contentElemId = `_test_content_${Date.now()}`;
			const contentId = await psql(
				`INSERT INTO rewrite_scene_content (scene_id, element_id, type, content, order_index) VALUES ('${sceneId}', '${contentElemId}', 'dialogue', 'Hello', 0) RETURNING id`
			);
			expect(contentId).toMatch(/^[0-9a-f-]{36}$/);

			// Delete scene should cascade to content
			await psql(`DELETE FROM rewrite_scenes WHERE id='${sceneId}'`);
			const contentCount = await psql(
				`SELECT count(*) FROM rewrite_scene_content WHERE id='${contentId}'`
			);
			expect(contentCount).toBe('0');

			// Cleanup
			await psql(`DELETE FROM rewrite_scripts WHERE id='${scriptId}'`);
		} finally {
			await psql(`DELETE FROM rewrite_projects WHERE id='${projectId}'`).catch(() => {});
		}
	});
});
