import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TraceEvent } from '$lib/server/trace.js';

// Mock the db module before importing traced
vi.mock('$lib/server/db.js', () => {
	const insertMock = vi.fn().mockResolvedValue({ error: null });
	return {
		supabase: {
			from: vi.fn().mockReturnValue({ insert: insertMock })
		}
	};
});

import { traced, createTraceId } from '$lib/server/trace.js';
import { supabase } from '$lib/server/db.js';

function getInsertedEvent(): TraceEvent {
	const insertCall = vi.mocked(supabase.from('rewrite_traces').insert);
	return insertCall.mock.calls[0][0] as unknown as TraceEvent;
}

describe('traced()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('executes the wrapped function and returns its result', async () => {
		const result = await traced('test-trace-id', 'myFunction', 'mutation', async () => {
			return { id: 1, name: 'test' };
		});

		expect(result).toEqual({ id: 1, name: 'test' });
	});

	it('records a trace event with correct fields on success', async () => {
		await traced('trace-abc', 'createProject', 'mutation', async () => {
			return { id: 42 };
		});

		expect(supabase.from).toHaveBeenCalledWith('rewrite_traces');

		const insertedEvent = getInsertedEvent();

		expect(insertedEvent.trace_id).toBe('trace-abc');
		expect(insertedEvent.event_type).toBe('mutation');
		expect(insertedEvent.function_name).toBe('createProject');
		expect(insertedEvent.result).toEqual({ id: 42 });
		expect(insertedEvent.error).toBeUndefined();
		expect(typeof insertedEvent.duration_ms).toBe('number');
		expect(insertedEvent.duration_ms).toBeGreaterThanOrEqual(0);
		expect(insertedEvent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('records an error trace and re-throws on failure', async () => {
		const error = new Error('DB connection failed');

		await expect(
			traced('trace-err', 'failingFunction', 'mutation', async () => {
				throw error;
			})
		).rejects.toThrow('DB connection failed');

		const insertedEvent = getInsertedEvent();

		expect(insertedEvent.trace_id).toBe('trace-err');
		expect(insertedEvent.event_type).toBe('error');
		expect(insertedEvent.function_name).toBe('failingFunction');
		expect(insertedEvent.error).toBe('DB connection failed');
		expect(insertedEvent.result).toBeUndefined();
		expect(typeof insertedEvent.duration_ms).toBe('number');
	});

	it('measures duration accurately for async operations', async () => {
		await traced('trace-dur', 'slowOp', 'api_call', async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			return 'done';
		});

		const insertedEvent = getInsertedEvent();

		expect(insertedEvent.duration_ms).toBeGreaterThanOrEqual(40);
	});

	it('handles non-Error thrown values', async () => {
		await expect(
			traced('trace-str', 'badFn', 'mutation', async () => {
				throw 'string error';
			})
		).rejects.toBe('string error');

		const insertedEvent = getInsertedEvent();

		expect(insertedEvent.error).toBe('string error');
	});
});

describe('createTraceId()', () => {
	it('returns a valid UUID v4 string', () => {
		const id = createTraceId();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('returns unique IDs on consecutive calls', () => {
		const ids = new Set(Array.from({ length: 100 }, () => createTraceId()));
		expect(ids.size).toBe(100);
	});
});
