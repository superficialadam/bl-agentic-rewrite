import { supabase } from './db.js';
import { randomUUID } from 'crypto';

export interface TraceEvent {
	trace_id: string;
	timestamp: string;
	event_type: 'request_start' | 'mutation' | 'api_call' | 'subscription' | 'error';
	function_name: string;
	arguments?: unknown;
	result?: unknown;
	error?: string;
	duration_ms?: number;
}

/**
 * Write a trace event to the rewrite_traces table.
 */
async function writeTrace(event: TraceEvent): Promise<void> {
	await supabase.from('rewrite_traces').insert(event);
}

/**
 * Wrap a function with tracing. Records start, result/error, and duration
 * to rewrite_traces. Re-throws errors after recording them.
 *
 * @param traceId - UUID grouping all events in one request
 * @param functionName - name of the function being traced
 * @param eventType - type of trace event
 * @param fn - the async function to execute
 */
export async function traced<T>(
	traceId: string,
	functionName: string,
	eventType: TraceEvent['event_type'],
	fn: () => Promise<T>
): Promise<T> {
	const start = performance.now();

	try {
		const result = await fn();
		const duration_ms = Math.round(performance.now() - start);

		await writeTrace({
			trace_id: traceId,
			timestamp: new Date().toISOString(),
			event_type: eventType,
			function_name: functionName,
			result: result as unknown,
			duration_ms
		});

		return result;
	} catch (err) {
		const duration_ms = Math.round(performance.now() - start);
		const errorMessage = err instanceof Error ? err.message : String(err);

		await writeTrace({
			trace_id: traceId,
			timestamp: new Date().toISOString(),
			event_type: 'error',
			function_name: functionName,
			error: errorMessage,
			duration_ms
		});

		throw err;
	}
}

/**
 * Generate a new trace ID for a request.
 */
export function createTraceId(): string {
	return randomUUID();
}
