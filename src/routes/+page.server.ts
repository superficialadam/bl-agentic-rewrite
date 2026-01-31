import type { PageServerLoad } from './$types';
import { traced } from '$lib/server/trace.js';

export const load: PageServerLoad = async ({ locals }) => {
	const projects = await traced(locals.traceId, 'loadProjects', 'request_start', async () => {
		const { data, error } = await locals.supabase
			.from('rewrite_projects')
			.select('id, name, slug, created_at, updated_at')
			.order('updated_at', { ascending: false });

		if (error) throw error;
		return data ?? [];
	});

	return { projects };
};
