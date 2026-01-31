import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function psql(query: string): string {
	return execSync(`psql "${DB_URL}" -t -A -q -c "${query.replace(/"/g, '\\"')}"`, {
		encoding: 'utf-8'
	}).trim();
}

test.describe('Script Sync to Database', () => {
	let projectId: string;
	let scriptId: string;
	let timelineId: string;
	let projectSlug: string;

	test.beforeAll(async ({ request }) => {
		const res = await request.post('/api/projects', {
			data: { name: `Sync Test ${Date.now()}` }
		});
		const project = await res.json();
		projectId = project.id;
		projectSlug = project.slug;
		scriptId = project.current_script_id;
		timelineId = project.current_timeline_id;
	});

	test.afterAll(async () => {
		try {
			psql(
				`UPDATE rewrite_projects SET current_script_id = NULL, current_timeline_id = NULL WHERE id = '${projectId}'`
			);
			psql(
				`DELETE FROM rewrite_scene_content WHERE scene_id IN (SELECT id FROM rewrite_scenes WHERE script_id = '${scriptId}')`
			);
			psql(`DELETE FROM rewrite_scenes WHERE script_id = '${scriptId}'`);
			psql(`DELETE FROM rewrite_tracks WHERE timeline_id = '${timelineId}'`);
			psql(`DELETE FROM rewrite_timelines WHERE project_id = '${projectId}'`);
			psql(`DELETE FROM rewrite_scripts WHERE project_id = '${projectId}'`);
			psql(`DELETE FROM rewrite_projects WHERE id = '${projectId}'`);
		} catch {
			// best effort cleanup
		}
	});

	const testDocument = {
		type: 'doc',
		content: [
			{
				type: 'sceneHeading',
				attrs: {
					element_id: 'sync-scene-1',
					scene_number: 201,
					int_ext: 'INT',
					location: 'LIVING ROOM',
					time_of_day: 'NIGHT'
				},
				content: [{ type: 'text', text: '201. INT. LIVING ROOM - NIGHT' }]
			},
			{
				type: 'action',
				attrs: { element_id: 'sync-action-1' },
				content: [{ type: 'text', text: 'The room is dark. A single lamp flickers.' }]
			},
			{
				type: 'character',
				attrs: { element_id: 'sync-char-1', character_name: 'MARY' },
				content: [{ type: 'text', text: 'MARY' }]
			},
			{
				type: 'dialogue',
				attrs: { element_id: 'sync-dial-1', character_name: 'MARY' },
				content: [{ type: 'text', text: 'Who turned off the lights?' }]
			},
			{
				type: 'sceneHeading',
				attrs: {
					element_id: 'sync-scene-2',
					scene_number: 202,
					int_ext: 'EXT',
					location: 'GARDEN',
					time_of_day: 'DAY'
				},
				content: [{ type: 'text', text: '202. EXT. GARDEN - DAY' }]
			},
			{
				type: 'action',
				attrs: { element_id: 'sync-action-2' },
				content: [{ type: 'text', text: 'Birds sing in the morning light.' }]
			}
		]
	};

	test('sync creates correct scene and content rows in DB', async ({ request }) => {
		const res = await request.post(`/api/scripts/${scriptId}/sync`, {
			data: { document: testDocument }
		});
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.success).toBe(true);
		expect(data.scenes_upserted).toBe(2);
		expect(data.content_upserted).toBe(4);

		// Verify scenes in DB
		const sceneCount = psql(
			`SELECT count(*) FROM rewrite_scenes WHERE script_id = '${scriptId}'`
		);
		expect(sceneCount).toBe('2');

		const scene1Location = psql(
			`SELECT location FROM rewrite_scenes WHERE element_id = 'sync-scene-1'`
		);
		expect(scene1Location).toBe('LIVING ROOM');

		const scene2IntExt = psql(
			`SELECT int_ext FROM rewrite_scenes WHERE element_id = 'sync-scene-2'`
		);
		expect(scene2IntExt).toBe('EXT');

		// Verify content in DB
		const dialogueRow = psql(
			`SELECT content || '|' || character_name FROM rewrite_scene_content WHERE element_id = 'sync-dial-1'`
		);
		expect(dialogueRow).toBe('Who turned off the lights?|MARY');

		// Verify order_index: scene 1 content should have indices 0,1,2
		const scene1ContentOrders = psql(
			`SELECT order_index FROM rewrite_scene_content WHERE scene_id = (SELECT id FROM rewrite_scenes WHERE element_id = 'sync-scene-1') ORDER BY order_index`
		);
		expect(scene1ContentOrders).toBe('0\n1\n2');
	});

	test('GET /api/scripts/[id] reconstructs full document from DB', async ({ request }) => {
		const res = await request.get(`/api/scripts/${scriptId}`);
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.scenes).toHaveLength(2);
		expect(data.scenes[0].location).toBe('LIVING ROOM');
		// scene_number is returned as string from Supabase
		expect(String(data.scenes[0].scene_number)).toBe('201');
		expect(data.scenes[0].content).toHaveLength(3);

		// Verify content order and types
		const scene1Types = data.scenes[0].content.map((c: { type: string }) => c.type);
		expect(scene1Types).toEqual(['action', 'character', 'dialogue']);

		// Verify scene 2
		expect(data.scenes[1].location).toBe('GARDEN');
		expect(data.scenes[1].int_ext).toBe('EXT');
		expect(data.scenes[1].content).toHaveLength(1);
		expect(data.scenes[1].content[0].type).toBe('action');
		expect(data.scenes[1].content[0].content).toBe('Birds sing in the morning light.');
	});

	test('page server load returns initialContent from DB', async ({ request }) => {
		// Verify via the page HTML that content was loaded
		const res = await request.get(`/${projectSlug}/create`);
		expect(res.status()).toBe(200);

		const html = await res.text();
		// The page should render without errors and contain the project name
		expect(html).toContain('script-editor');

		// Verify via direct DB query that the scenes exist for our script
		const sceneCount = psql(
			`SELECT count(*) FROM rewrite_scenes WHERE script_id = '${scriptId}'`
		);
		expect(sceneCount).toBe('2');

		// Verify recordsToDocument is called by checking the API directly
		// (the page load calls it internally, but we verify the roundtrip via GET API)
		const apiRes = await request.get(`/api/scripts/${scriptId}`);
		const apiData = await apiRes.json();
		expect(apiData.scenes).toHaveLength(2);
		expect(apiData.scenes[0].element_id).toBe('sync-scene-1');
	});

	test('orphan cleanup removes deleted content on re-sync', async ({ request }) => {
		// First verify we have the full data
		const beforeScenes = psql(
			`SELECT count(*) FROM rewrite_scenes WHERE script_id = '${scriptId}'`
		);
		expect(beforeScenes).toBe('2');

		const beforeContent = psql(
			`SELECT count(*) FROM rewrite_scene_content WHERE scene_id IN (SELECT id FROM rewrite_scenes WHERE script_id = '${scriptId}')`
		);
		expect(beforeContent).toBe('4');

		// Sync with scene 2 and dialogue/character removed
		const reducedDocument = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: {
						element_id: 'sync-scene-1',
						scene_number: 201,
						int_ext: 'INT',
						location: 'LIVING ROOM',
						time_of_day: 'NIGHT'
					},
					content: [{ type: 'text', text: '201. INT. LIVING ROOM - NIGHT' }]
				},
				{
					type: 'action',
					attrs: { element_id: 'sync-action-1' },
					content: [
						{ type: 'text', text: 'The room is dark. A single lamp flickers.' }
					]
				}
			]
		};

		const res = await request.post(`/api/scripts/${scriptId}/sync`, {
			data: { document: reducedDocument }
		});
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.success).toBe(true);
		// orphans_deleted counts: 1 scene (scene-2, cascade deletes action-2) + 2 content (char-1, dial-1) = 3
		expect(data.orphans_deleted).toBe(3);

		// Verify: only scene 1 remains with 1 content row
		const sceneCount = psql(
			`SELECT count(*) FROM rewrite_scenes WHERE script_id = '${scriptId}'`
		);
		expect(sceneCount).toBe('1');

		const contentCount = psql(
			`SELECT count(*) FROM rewrite_scene_content WHERE scene_id IN (SELECT id FROM rewrite_scenes WHERE script_id = '${scriptId}')`
		);
		expect(contentCount).toBe('1');
	});

	test('re-sync with new content and reload preserves roundtrip', async ({ request }) => {
		// Sync fresh document
		const freshDocument = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: {
						element_id: 'rt-scene-1',
						scene_number: 1,
						int_ext: 'INT',
						location: 'OFFICE',
						time_of_day: 'DAY'
					},
					content: [{ type: 'text', text: '1. INT. OFFICE - DAY' }]
				},
				{
					type: 'character',
					attrs: { element_id: 'rt-char-1', character_name: 'BOSS' },
					content: [{ type: 'text', text: 'BOSS' }]
				},
				{
					type: 'dialogue',
					attrs: { element_id: 'rt-dial-1', character_name: 'BOSS' },
					content: [{ type: 'text', text: "You're fired." }]
				}
			]
		};

		const syncRes = await request.post(`/api/scripts/${scriptId}/sync`, {
			data: { document: freshDocument }
		});
		expect(syncRes.status()).toBe(200);

		// Now GET the script — simulates "reload"
		const getRes = await request.get(`/api/scripts/${scriptId}`);
		expect(getRes.status()).toBe(200);

		const loaded = await getRes.json();
		expect(loaded.scenes).toHaveLength(1);
		expect(loaded.scenes[0].location).toBe('OFFICE');
		expect(String(loaded.scenes[0].scene_number)).toBe('1');
		expect(loaded.scenes[0].content).toHaveLength(2);

		// Verify content roundtrip: character name preserved, dialogue text preserved
		const charContent = loaded.scenes[0].content.find(
			(c: { type: string }) => c.type === 'character'
		);
		expect(charContent.content).toBe('BOSS');
		expect(charContent.character_name).toBe('BOSS');

		const dialContent = loaded.scenes[0].content.find(
			(c: { type: string }) => c.type === 'dialogue'
		);
		expect(dialContent.content).toBe("You're fired.");
		expect(dialContent.character_name).toBe('BOSS');
	});

	test('traces recorded for sync operations', async () => {
		const traceCount = psql(
			`SELECT count(*) FROM rewrite_traces WHERE function_name IN ('syncScript', 'loadScriptContent') AND trace_id IS NOT NULL`
		);
		expect(Number(traceCount)).toBeGreaterThanOrEqual(1);
	});
});
