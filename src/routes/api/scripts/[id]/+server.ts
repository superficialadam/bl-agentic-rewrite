import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { traced } from '$lib/server/trace.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const scriptId = params.id;

	const result = await traced(locals.traceId, 'getScript', 'mutation', async () => {
		// Fetch script
		const { data: script, error: scriptErr } = await locals.supabase
			.from('rewrite_scripts')
			.select('id, project_id, title')
			.eq('id', scriptId)
			.single();

		if (scriptErr) throw scriptErr;

		// Fetch scenes ordered by order_index
		const { data: scenes, error: scenesErr } = await locals.supabase
			.from('rewrite_scenes')
			.select('id, element_id, scene_number, int_ext, location, time_of_day, order_index')
			.eq('script_id', scriptId)
			.order('order_index');

		if (scenesErr) throw scenesErr;

		// Fetch all scene content for these scenes
		const sceneIds = scenes.map((s: { id: string }) => s.id);
		let contentRows: Array<{
			id: string;
			scene_id: string;
			element_id: string;
			type: string;
			content: string;
			character_name: string | null;
			audio_status: string;
			order_index: number;
		}> = [];

		if (sceneIds.length > 0) {
			const { data: content, error: contentErr } = await locals.supabase
				.from('rewrite_scene_content')
				.select('id, scene_id, element_id, type, content, character_name, audio_status, order_index')
				.in('scene_id', sceneIds)
				.order('order_index');

			if (contentErr) throw contentErr;
			contentRows = content ?? [];
		}

		// Group content by scene_id
		const contentByScene = new Map<string, typeof contentRows>();
		for (const row of contentRows) {
			const arr = contentByScene.get(row.scene_id) ?? [];
			arr.push(row);
			contentByScene.set(row.scene_id, arr);
		}

		// Assemble response
		const scenesWithContent = scenes.map((scene: { id: string; element_id: string; scene_number: number; int_ext: string; location: string; time_of_day: string; order_index: number }) => ({
			...scene,
			content: (contentByScene.get(scene.id) ?? []).map(({ scene_id: _, ...rest }) => rest)
		}));

		return { script, scenes: scenesWithContent };
	});

	return json(result);
};
