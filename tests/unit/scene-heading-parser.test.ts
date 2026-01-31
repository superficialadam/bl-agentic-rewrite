import { describe, it, expect } from 'vitest';
import { parseSceneHeading } from '../../src/lib/script/parser.js';

describe('parseSceneHeading', () => {
	it('parses standard INT heading with time of day', () => {
		const result = parseSceneHeading('201. INT. KITCHEN - DAY');
		expect(result.scene_number).toBe(201);
		expect(result.int_ext).toBe('INT');
		expect(result.location).toBe('KITCHEN');
		expect(result.time_of_day).toBe('DAY');
	});

	it('parses EXT heading with time of day', () => {
		const result = parseSceneHeading('5. EXT. PARK - NIGHT');
		expect(result.scene_number).toBe(5);
		expect(result.int_ext).toBe('EXT');
		expect(result.location).toBe('PARK');
		expect(result.time_of_day).toBe('NIGHT');
	});

	it('parses INT/EXT heading', () => {
		const result = parseSceneHeading('12. INT/EXT. CAR - DAWN');
		expect(result.scene_number).toBe(12);
		expect(result.int_ext).toBe('INT/EXT');
		expect(result.location).toBe('CAR');
		expect(result.time_of_day).toBe('DAWN');
	});

	it('parses heading without time of day', () => {
		const result = parseSceneHeading('99. INT. HALLWAY');
		expect(result.scene_number).toBe(99);
		expect(result.int_ext).toBe('INT');
		expect(result.location).toBe('HALLWAY');
		expect(result.time_of_day).toBeNull();
	});

	it('parses heading with multi-word location', () => {
		const result = parseSceneHeading('201. INT. TOMMY & ANNIKAS HUS - DAG');
		expect(result.scene_number).toBe(201);
		expect(result.int_ext).toBe('INT');
		expect(result.location).toBe('TOMMY & ANNIKAS HUS');
		expect(result.time_of_day).toBe('DAG');
	});

	it('parses lowercase input and normalizes int_ext', () => {
		const result = parseSceneHeading('3. int. office - evening');
		expect(result.scene_number).toBe(3);
		expect(result.int_ext).toBe('INT');
		expect(result.location).toBe('office');
		expect(result.time_of_day).toBe('evening');
	});

	it('returns nulls for unparseable text with location fallback', () => {
		const result = parseSceneHeading('Just some random text');
		expect(result.scene_number).toBeNull();
		expect(result.int_ext).toBeNull();
		expect(result.location).toBe('Just some random text');
		expect(result.time_of_day).toBeNull();
	});

	it('returns all nulls for empty string', () => {
		const result = parseSceneHeading('');
		expect(result.scene_number).toBeNull();
		expect(result.int_ext).toBeNull();
		expect(result.location).toBeNull();
		expect(result.time_of_day).toBeNull();
	});

	it('handles whitespace trimming', () => {
		const result = parseSceneHeading('  201. INT. KITCHEN - DAY  ');
		expect(result.scene_number).toBe(201);
		expect(result.int_ext).toBe('INT');
		expect(result.location).toBe('KITCHEN');
		expect(result.time_of_day).toBe('DAY');
	});
});
