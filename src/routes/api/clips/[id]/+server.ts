import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { traced } from '$lib/server/trace.js';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const clipId = params.id;
	const body = await request.json();

	const allowedFields = ['start_frame', 'duration_frames', 'offset_frames', 'volume', 'opacity'];
	const updateData: Record<string, unknown> = {};

	for (const field of allowedFields) {
		if (body[field] != null) {
			updateData[field] = body[field];
		}
	}

	if (Object.keys(updateData).length === 0) {
		error(400, 'No valid fields to update');
	}

	const clip = await traced(locals.traceId, 'updateClip', 'mutation', async () => {
		const { data: clip, error: clipErr } = await locals.supabase
			.from('rewrite_clips')
			.update(updateData)
			.eq('id', clipId)
			.select()
			.single();

		if (clipErr) throw clipErr;
		return clip;
	});

	return json({ clip });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const clipId = params.id;

	await traced(locals.traceId, 'deleteClip', 'mutation', async () => {
		const { error: delErr } = await locals.supabase
			.from('rewrite_clips')
			.delete()
			.eq('id', clipId);

		if (delErr) throw delErr;
	});

	return json({ success: true });
};
