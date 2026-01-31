import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function psql(query: string): string {
	return execSync(`psql "${DB_URL}" -t -A -q -c "${query.replace(/"/g, '\\"')}"`, {
		encoding: 'utf-8'
	}).trim();
}

test.describe('Script & Timeline API Routes', () => {
	let projectId: string;
	let scriptId: string;
	let timelineId: string;
	let trackV1Id: string;
	let trackA1Id: string;
	let projectSlug: string;

	test.beforeAll(async ({ request }) => {
		const res = await request.post('/api/projects', {
			data: { name: `API Test ${Date.now()}` }
		});
		const project = await res.json();
		projectId = project.id;
		projectSlug = project.slug;
		scriptId = project.current_script_id;
		timelineId = project.current_timeline_id;

		// Get track IDs
		const tracks = psql(
			`SELECT id || ':' || name FROM rewrite_tracks WHERE timeline_id = '${timelineId}' ORDER BY order_index`
		);
		const trackLines = tracks.split('\n');
		trackV1Id = trackLines[0].split(':')[0];
		trackA1Id = trackLines[1].split(':')[0];
	});

	test.afterAll(async () => {
		try {
			psql(`UPDATE rewrite_projects SET current_script_id = NULL, current_timeline_id = NULL WHERE id = '${projectId}'`);
			psql(`DELETE FROM rewrite_clips WHERE track_id IN (SELECT id FROM rewrite_tracks WHERE timeline_id = '${timelineId}')`);
			psql(`DELETE FROM rewrite_scene_content WHERE scene_id IN (SELECT id FROM rewrite_scenes WHERE script_id = '${scriptId}')`);
			psql(`DELETE FROM rewrite_scenes WHERE script_id = '${scriptId}'`);
			psql(`DELETE FROM rewrite_tracks WHERE timeline_id = '${timelineId}'`);
			psql(`DELETE FROM rewrite_timelines WHERE project_id = '${projectId}'`);
			psql(`DELETE FROM rewrite_scripts WHERE project_id = '${projectId}'`);
			psql(`DELETE FROM rewrite_projects WHERE id = '${projectId}'`);
		} catch {
			// best effort cleanup
		}
	});

	test('GET /api/scripts/[id] returns script with empty scenes', async ({ request }) => {
		const res = await request.get(`/api/scripts/${scriptId}`);
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.script.id).toBe(scriptId);
		expect(data.script.project_id).toBe(projectId);
		expect(data.script.title).toBe('Untitled Script');
		expect(data.scenes).toEqual([]);
	});

	test('POST /api/scripts/[id]/sync creates scenes and content', async ({ request }) => {
		const document = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: {
						element_id: 'scene-1',
						scene_number: 1,
						int_ext: 'INT',
						location: 'KITCHEN',
						time_of_day: 'DAY'
					},
					content: [{ type: 'text', text: '1. INT. KITCHEN - DAY' }]
				},
				{
					type: 'action',
					attrs: { element_id: 'action-1' },
					content: [{ type: 'text', text: 'John enters the room.' }]
				},
				{
					type: 'character',
					attrs: { element_id: 'char-1', character_name: 'JOHN' },
					content: [{ type: 'text', text: 'JOHN' }]
				},
				{
					type: 'dialogue',
					attrs: { element_id: 'dial-1' },
					content: [{ type: 'text', text: 'Hello, world.' }]
				}
			]
		};

		const res = await request.post(`/api/scripts/${scriptId}/sync`, {
			data: { document }
		});
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.success).toBe(true);
		expect(data.scenes_upserted).toBe(1);
		expect(data.content_upserted).toBe(3);
		expect(data.orphans_deleted).toBe(0);

		// Verify DB rows
		const sceneLocation = psql(
			`SELECT location FROM rewrite_scenes WHERE script_id = '${scriptId}' AND element_id = 'scene-1'`
		);
		expect(sceneLocation).toBe('KITCHEN');

		const contentCount = psql(
			`SELECT count(*) FROM rewrite_scene_content WHERE scene_id IN (SELECT id FROM rewrite_scenes WHERE script_id = '${scriptId}')`
		);
		expect(contentCount).toBe('3');

		const dialogueCharacter = psql(
			`SELECT character_name FROM rewrite_scene_content WHERE element_id = 'dial-1'`
		);
		expect(dialogueCharacter).toBe('JOHN');
	});

	test('GET /api/scripts/[id] returns synced scenes and content', async ({ request }) => {
		const res = await request.get(`/api/scripts/${scriptId}`);
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.scenes).toHaveLength(1);
		expect(data.scenes[0].location).toBe('KITCHEN');
		expect(data.scenes[0].int_ext).toBe('INT');
		expect(data.scenes[0].content).toHaveLength(3);

		const types = data.scenes[0].content.map((c: { type: string }) => c.type);
		expect(types).toEqual(['action', 'character', 'dialogue']);
	});

	test('POST /api/scripts/[id]/sync orphan cleanup removes deleted content', async ({
		request
	}) => {
		// Sync with dialogue removed
		const document = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: {
						element_id: 'scene-1',
						scene_number: 1,
						int_ext: 'INT',
						location: 'KITCHEN',
						time_of_day: 'DAY'
					},
					content: [{ type: 'text', text: '1. INT. KITCHEN - DAY' }]
				},
				{
					type: 'action',
					attrs: { element_id: 'action-1' },
					content: [{ type: 'text', text: 'John enters the room.' }]
				}
			]
		};

		const res = await request.post(`/api/scripts/${scriptId}/sync`, {
			data: { document }
		});
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.orphans_deleted).toBe(2); // character + dialogue removed

		// Verify DB: only action remains
		const contentCount = psql(
			`SELECT count(*) FROM rewrite_scene_content WHERE scene_id IN (SELECT id FROM rewrite_scenes WHERE script_id = '${scriptId}')`
		);
		expect(contentCount).toBe('1');
	});

	test('GET /api/timelines/[id] returns timeline with tracks and empty clips', async ({
		request
	}) => {
		const res = await request.get(`/api/timelines/${timelineId}`);
		expect(res.status()).toBe(200);

		const data = await res.json();
		expect(data.timeline.id).toBe(timelineId);
		expect(data.timeline.project_id).toBe(projectId);
		expect(data.timeline.frame_rate).toBe(30);
		expect(data.tracks).toHaveLength(2);
		expect(data.tracks[0].name).toBe('V1');
		expect(data.tracks[0].type).toBe('video');
		expect(data.tracks[1].name).toBe('A1');
		expect(data.tracks[1].type).toBe('audio');
		expect(data.clips).toEqual([]);
	});

	test('POST /api/timelines/[id]/clips creates a clip', async ({ request }) => {
		const res = await request.post(`/api/timelines/${timelineId}/clips`, {
			data: {
				track_id: trackV1Id,
				start_frame: 0,
				duration_frames: 150,
				name: 'Test Clip'
			}
		});
		expect(res.status()).toBe(201);

		const data = await res.json();
		expect(data.clip.track_id).toBe(trackV1Id);
		expect(data.clip.start_frame).toBe(0);
		expect(data.clip.duration_frames).toBe(150);
		expect(data.clip.name).toBe('Test Clip');

		// Verify DB
		const dbClip = psql(
			`SELECT start_frame || ':' || duration_frames FROM rewrite_clips WHERE id = '${data.clip.id}'`
		);
		expect(dbClip).toBe('0:150');
	});

	test('PUT /api/clips/[id] updates clip fields', async ({ request }) => {
		// Create a clip first
		const createRes = await request.post(`/api/timelines/${timelineId}/clips`, {
			data: {
				track_id: trackV1Id,
				start_frame: 30,
				duration_frames: 90
			}
		});
		const { clip } = await createRes.json();

		// Update it
		const updateRes = await request.put(`/api/clips/${clip.id}`, {
			data: {
				start_frame: 60,
				duration_frames: 120,
				opacity: 0.5
			}
		});
		expect(updateRes.status()).toBe(200);

		const data = await updateRes.json();
		expect(data.clip.start_frame).toBe(60);
		expect(data.clip.duration_frames).toBe(120);
		expect(Number(data.clip.opacity)).toBeCloseTo(0.5);

		// Verify DB
		const dbFrame = psql(`SELECT start_frame FROM rewrite_clips WHERE id = '${clip.id}'`);
		expect(dbFrame).toBe('60');
	});

	test('DELETE /api/clips/[id] removes clip', async ({ request }) => {
		// Create a clip first
		const createRes = await request.post(`/api/timelines/${timelineId}/clips`, {
			data: {
				track_id: trackA1Id,
				start_frame: 0,
				duration_frames: 60
			}
		});
		const { clip } = await createRes.json();

		// Delete it
		const delRes = await request.delete(`/api/clips/${clip.id}`);
		expect(delRes.status()).toBe(200);

		const data = await delRes.json();
		expect(data.success).toBe(true);

		// Verify gone from DB
		const count = psql(`SELECT count(*) FROM rewrite_clips WHERE id = '${clip.id}'`);
		expect(count).toBe('0');
	});

	test('POST /api/timelines/[id]/clips rejects invalid track', async ({ request }) => {
		const res = await request.post(`/api/timelines/${timelineId}/clips`, {
			data: {
				track_id: '00000000-0000-0000-0000-000000000000',
				start_frame: 0,
				duration_frames: 30
			}
		});
		expect(res.status()).toBe(500);
	});

	test('PUT /api/clips/[id] rejects empty update', async ({ request }) => {
		const res = await request.put(`/api/clips/00000000-0000-0000-0000-000000000000`, {
			data: {}
		});
		expect(res.status()).toBe(400);
	});

	test('traces are recorded for API operations', async () => {
		const traceCount = psql(
			`SELECT count(*) FROM rewrite_traces WHERE function_name IN ('getScript', 'syncScript', 'getTimeline', 'createClip', 'updateClip', 'deleteClip')`
		);
		expect(Number(traceCount)).toBeGreaterThanOrEqual(6);
	});
});
