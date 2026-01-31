import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { traced } from '$lib/server/trace.js';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const timelineId = params.id;
	const body = await request.json();

	const { track_id, asset_id, start_frame, duration_frames, name } = body;

	if (!track_id || start_frame == null || duration_frames == null) {
		error(400, 'track_id, start_frame, and duration_frames are required');
	}

	const clip = await traced(locals.traceId, 'createClip', 'mutation', async () => {
		// Verify track belongs to this timeline
		const { data: track, error: trackErr } = await locals.supabase
			.from('rewrite_tracks')
			.select('id')
			.eq('id', track_id)
			.eq('timeline_id', timelineId)
			.single();

		if (trackErr) throw trackErr;

		const insertData: Record<string, unknown> = {
			track_id,
			start_frame,
			duration_frames
		};

		if (asset_id) insertData.asset_id = asset_id;
		if (name) insertData.name = name;

		const { data: clip, error: clipErr } = await locals.supabase
			.from('rewrite_clips')
			.insert(insertData)
			.select()
			.single();

		if (clipErr) throw clipErr;
		return clip;
	});

	return json({ clip }, { status: 201 });
};
