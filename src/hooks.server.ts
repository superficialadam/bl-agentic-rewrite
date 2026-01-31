import type { Handle } from '@sveltejs/kit';
import { supabase } from '$lib/server/db.js';
import { createTraceId } from '$lib/server/trace.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = supabase;
	event.locals.traceId = createTraceId();

	return resolve(event);
};
