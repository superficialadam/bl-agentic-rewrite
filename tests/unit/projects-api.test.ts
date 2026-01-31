import { describe, it, expect } from 'vitest';

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

describe('slugify', () => {
	it('converts spaces and special chars to hyphens', () => {
		expect(slugify('My Cool Project')).toBe('my-cool-project');
	});

	it('strips leading and trailing hyphens', () => {
		expect(slugify('--hello--')).toBe('hello');
	});

	it('collapses multiple separators', () => {
		expect(slugify('a   b!!!c')).toBe('a-b-c');
	});

	it('handles single word', () => {
		expect(slugify('test')).toBe('test');
	});
});
