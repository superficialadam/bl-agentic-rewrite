import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { traced } from '$lib/server/trace.js';
import { recordsToDocument, type SceneRecord } from '$lib/script/document-mapper.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const project = await traced(locals.traceId, 'loadProject', 'request_start', async () => {
		const { data, error: dbErr } = await locals.supabase
			.from('rewrite_projects')
			.select('id, name, slug, current_script_id, current_timeline_id, created_at, updated_at')
			.eq('slug', params.project)
			.single();

		if (dbErr || !data) throw dbErr ?? new Error('Not found');
		return data;
	});

	if (!project) {
		error(404, 'Project not found');
	}

	// Load script content from DB and reconstruct TipTap document
	let initialContent = null;
	if (project.current_script_id) {
		initialContent = await traced(locals.traceId, 'loadScriptContent', 'request_start', async () => {
			const { data: scenes, error: scenesErr } = await locals.supabase
				.from('rewrite_scenes')
				.select('id, element_id, scene_number, int_ext, location, time_of_day, order_index')
				.eq('script_id', project.current_script_id)
				.order('order_index');

			if (scenesErr) throw scenesErr;
			if (!scenes || scenes.length === 0) return null;

			const sceneIds = scenes.map((s: { id: string }) => s.id);
			const { data: contentRows, error: contentErr } = await locals.supabase
				.from('rewrite_scene_content')
				.select('id, scene_id, element_id, type, content, character_name, audio_status, order_index')
				.in('scene_id', sceneIds)
				.order('order_index');

			if (contentErr) throw contentErr;

			// Group content by scene_id
			const contentByScene = new Map<string, typeof contentRows>();
			for (const row of contentRows ?? []) {
				const arr = contentByScene.get(row.scene_id) ?? [];
				arr.push(row);
				contentByScene.set(row.scene_id, arr);
			}

			const sceneRecords: SceneRecord[] = scenes.map((scene: { id: string; element_id: string; scene_number: number; int_ext: string; location: string; time_of_day: string; order_index: number }) => ({
				...scene,
				content: (contentByScene.get(scene.id) ?? []).map(({ scene_id: _, ...rest }) => rest)
			}));

			return recordsToDocument(sceneRecords);
		});
	}

	return { project, initialContent };
};
