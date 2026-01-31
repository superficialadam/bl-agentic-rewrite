import { describe, it, expect } from 'vitest';
import {
	recordsToDocument,
	documentToRecords,
	type SceneRecord
} from '../../src/lib/script/document-mapper.js';

describe('recordsToDocument', () => {
	it('converts scene records to TipTap document JSON', () => {
		const scenes: SceneRecord[] = [
			{
				id: 'scene-1',
				element_id: 'elem-1',
				scene_number: 201,
				int_ext: 'INT',
				location: 'KITCHEN',
				time_of_day: 'DAY',
				order_index: 0,
				content: [
					{
						id: 'content-1',
						element_id: 'elem-2',
						type: 'action',
						content: 'John enters the room.',
						character_name: null,
						order_index: 0
					},
					{
						id: 'content-2',
						element_id: 'elem-3',
						type: 'character',
						content: 'JOHN',
						character_name: 'JOHN',
						order_index: 1
					},
					{
						id: 'content-3',
						element_id: 'elem-4',
						type: 'dialogue',
						content: 'Hello, world.',
						character_name: 'JOHN',
						order_index: 2
					}
				]
			}
		];

		const doc = recordsToDocument(scenes);

		expect(doc.type).toBe('doc');
		expect(doc.content).toHaveLength(4); // 1 heading + 3 content nodes

		const heading = doc.content![0];
		expect(heading.type).toBe('sceneHeading');
		expect(heading.attrs?.element_id).toBe('elem-1');
		expect(heading.attrs?.scene_number).toBe(201);
		expect(heading.attrs?.int_ext).toBe('INT');
		expect(heading.content![0].text).toBe('201. INT. KITCHEN - DAY');

		const action = doc.content![1];
		expect(action.type).toBe('action');
		expect(action.attrs?.element_id).toBe('elem-2');
		expect(action.content![0].text).toBe('John enters the room.');

		const character = doc.content![2];
		expect(character.type).toBe('character');
		expect(character.attrs?.character_name).toBe('JOHN');

		const dialogue = doc.content![3];
		expect(dialogue.type).toBe('dialogue');
		expect(dialogue.attrs?.character_name).toBe('JOHN');
		expect(dialogue.content![0].text).toBe('Hello, world.');
	});

	it('handles scene without time of day', () => {
		const scenes: SceneRecord[] = [
			{
				id: 's1',
				element_id: 'e1',
				scene_number: 1,
				int_ext: 'EXT',
				location: 'PARK',
				time_of_day: null,
				order_index: 0,
				content: []
			}
		];

		const doc = recordsToDocument(scenes);
		expect(doc.content![0].content![0].text).toBe('1. EXT. PARK');
	});

	it('handles multiple scenes', () => {
		const scenes: SceneRecord[] = [
			{
				id: 's1',
				element_id: 'e1',
				scene_number: 1,
				int_ext: 'INT',
				location: 'OFFICE',
				time_of_day: 'DAY',
				order_index: 0,
				content: []
			},
			{
				id: 's2',
				element_id: 'e2',
				scene_number: 2,
				int_ext: 'EXT',
				location: 'STREET',
				time_of_day: 'NIGHT',
				order_index: 1,
				content: []
			}
		];

		const doc = recordsToDocument(scenes);
		expect(doc.content).toHaveLength(2);
		expect(doc.content![0].type).toBe('sceneHeading');
		expect(doc.content![1].type).toBe('sceneHeading');
		expect(doc.content![1].attrs?.location).toBe('STREET');
	});
});

describe('documentToRecords', () => {
	it('extracts scenes and content from TipTap JSON', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: {
						element_id: 'elem-1',
						scene_number: 201,
						int_ext: 'INT',
						location: 'KITCHEN',
						time_of_day: 'DAY'
					},
					content: [{ type: 'text', text: '201. INT. KITCHEN - DAY' }]
				},
				{
					type: 'action',
					attrs: { element_id: 'elem-2' },
					content: [{ type: 'text', text: 'John enters.' }]
				},
				{
					type: 'character',
					attrs: { element_id: 'elem-3', character_name: 'JOHN' },
					content: [{ type: 'text', text: 'JOHN' }]
				},
				{
					type: 'dialogue',
					attrs: { element_id: 'elem-4', character_name: 'JOHN' },
					content: [{ type: 'text', text: 'Hello.' }]
				}
			]
		};

		const { scenes, contents } = documentToRecords(doc);

		expect(scenes).toHaveLength(1);
		expect(scenes[0].element_id).toBe('elem-1');
		expect(scenes[0].scene_number).toBe(201);
		expect(scenes[0].int_ext).toBe('INT');
		expect(scenes[0].location).toBe('KITCHEN');

		expect(contents).toHaveLength(3);
		expect(contents[0].type).toBe('action');
		expect(contents[0].content).toBe('John enters.');
		expect(contents[0].scene_element_id).toBe('elem-1');

		expect(contents[1].type).toBe('character');
		expect(contents[1].character_name).toBe('JOHN');

		expect(contents[2].type).toBe('dialogue');
		expect(contents[2].character_name).toBe('JOHN');
		expect(contents[2].content).toBe('Hello.');
	});

	it('ignores nodes without element_id', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: { element_id: 'e1', scene_number: 1, int_ext: 'INT', location: 'A', time_of_day: null },
					content: [{ type: 'text', text: '1. INT. A' }]
				},
				{
					type: 'action',
					attrs: {},
					content: [{ type: 'text', text: 'No ID node' }]
				}
			]
		};

		const { contents } = documentToRecords(doc);
		expect(contents).toHaveLength(0);
	});

	it('ignores content before first scene heading', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'action',
					attrs: { element_id: 'orphan' },
					content: [{ type: 'text', text: 'Orphan text' }]
				},
				{
					type: 'sceneHeading',
					attrs: { element_id: 'e1', scene_number: 1, int_ext: 'INT', location: 'A', time_of_day: null },
					content: [{ type: 'text', text: '1. INT. A' }]
				}
			]
		};

		const { scenes, contents } = documentToRecords(doc);
		expect(scenes).toHaveLength(1);
		expect(contents).toHaveLength(0);
	});

	it('tracks character name for subsequent dialogue', () => {
		const doc = {
			type: 'doc',
			content: [
				{
					type: 'sceneHeading',
					attrs: { element_id: 'e1', scene_number: 1, int_ext: 'INT', location: 'A', time_of_day: null },
					content: [{ type: 'text', text: '1. INT. A' }]
				},
				{
					type: 'character',
					attrs: { element_id: 'e2' },
					content: [{ type: 'text', text: 'Mary' }]
				},
				{
					type: 'dialogue',
					attrs: { element_id: 'e3' },
					content: [{ type: 'text', text: 'Hi there.' }]
				},
				{
					type: 'character',
					attrs: { element_id: 'e4' },
					content: [{ type: 'text', text: 'Bob' }]
				},
				{
					type: 'dialogue',
					attrs: { element_id: 'e5' },
					content: [{ type: 'text', text: 'Hey.' }]
				}
			]
		};

		const { contents } = documentToRecords(doc);
		expect(contents[0].character_name).toBe('MARY');
		expect(contents[1].character_name).toBe('MARY');
		expect(contents[2].character_name).toBe('BOB');
		expect(contents[3].character_name).toBe('BOB');
	});
});
