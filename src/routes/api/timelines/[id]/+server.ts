import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { traced } from '$lib/server/trace.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const timelineId = params.id;

	const result = await traced(locals.traceId, 'getTimeline', 'mutation', async () => {
		// Fetch timeline
		const { data: timeline, error: tlErr } = await locals.supabase
			.from('rewrite_timelines')
			.select('id, project_id, name, duration_seconds, frame_rate, width, height')
			.eq('id', timelineId)
			.single();

		if (tlErr) throw tlErr;

		// Fetch tracks ordered by order_index
		const { data: tracks, error: tracksErr } = await locals.supabase
			.from('rewrite_tracks')
			.select('id, name, type, order_index, muted, hidden')
			.eq('timeline_id', timelineId)
			.order('order_index');

		if (tracksErr) throw tracksErr;

		// Fetch clips for all tracks, with asset data
		const trackIds = tracks.map((t: { id: string }) => t.id);
		let clips: Array<Record<string, unknown>> = [];

		if (trackIds.length > 0) {
			const { data: clipData, error: clipsErr } = await locals.supabase
				.from('rewrite_clips')
				.select(`
					id, track_id, asset_id, start_frame, duration_frames, offset_frames,
					name, volume, opacity,
					rewrite_assets ( file_url, file_type, duration_ms, width, height )
				`)
				.in('track_id', trackIds);

			if (clipsErr) throw clipsErr;

			clips = (clipData ?? []).map((clip: Record<string, unknown>) => ({
				...clip,
				asset: clip.rewrite_assets ?? null,
				rewrite_assets: undefined
			}));
		}

		return { timeline, tracks, clips };
	});

	return json(result);
};
