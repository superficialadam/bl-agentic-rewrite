import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { traced } from '$lib/server/trace.js';

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

	return { project };
};
