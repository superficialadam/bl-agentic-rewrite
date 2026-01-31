import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { traced } from '$lib/server/trace.js';

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const name = body.name?.trim();

	if (!name) {
		error(400, 'Project name is required');
	}

	const slug = slugify(name) + '-' + Date.now().toString(36);

	const project = await traced(locals.traceId, 'createProject', 'mutation', async () => {
		// Create project
		const { data: proj, error: projErr } = await locals.supabase
			.from('rewrite_projects')
			.insert({ name, slug })
			.select()
			.single();

		if (projErr) throw projErr;

		// Create default script
		const { data: script, error: scriptErr } = await locals.supabase
			.from('rewrite_scripts')
			.insert({ project_id: proj.id, title: 'Untitled Script' })
			.select()
			.single();

		if (scriptErr) throw scriptErr;

		// Create default timeline
		const { data: timeline, error: tlErr } = await locals.supabase
			.from('rewrite_timelines')
			.insert({ project_id: proj.id, name: 'Main Timeline' })
			.select()
			.single();

		if (tlErr) throw tlErr;

		// Create default tracks (V1, A1)
		const { error: trackErr } = await locals.supabase.from('rewrite_tracks').insert([
			{ timeline_id: timeline.id, name: 'V1', type: 'video', order_index: 0 },
			{ timeline_id: timeline.id, name: 'A1', type: 'audio', order_index: 1 }
		]);

		if (trackErr) throw trackErr;

		// Link script and timeline to project
		const { data: updated, error: updateErr } = await locals.supabase
			.from('rewrite_projects')
			.update({
				current_script_id: script.id,
				current_timeline_id: timeline.id
			})
			.eq('id', proj.id)
			.select()
			.single();

		if (updateErr) throw updateErr;
		return updated;
	});

	return json(project, { status: 201 });
};
