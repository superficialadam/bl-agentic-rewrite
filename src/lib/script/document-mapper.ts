/**
 * Maps between TipTap document JSON and database records.
 * Used for reconstructing editor state from DB on load.
 */

import type { JSONContent } from '@tiptap/core';

export interface SceneRecord {
	id: string;
	element_id: string;
	scene_number: number | null;
	int_ext: string | null;
	location: string | null;
	time_of_day: string | null;
	order_index: number;
	content: ContentRecord[];
}

export interface ContentRecord {
	id: string;
	element_id: string;
	type: 'action' | 'character' | 'dialogue' | 'parenthetical';
	content: string;
	character_name: string | null;
	order_index: number;
}

/**
 * Reconstruct a TipTap document from database scene/content records.
 */
export function recordsToDocument(scenes: SceneRecord[]): JSONContent {
	const content: JSONContent[] = [];

	for (const scene of scenes) {
		content.push({
			type: 'sceneHeading',
			attrs: {
				element_id: scene.element_id,
				scene_number: scene.scene_number,
				int_ext: scene.int_ext,
				location: scene.location,
				time_of_day: scene.time_of_day
			},
			content: [
				{
					type: 'text',
					text: formatSceneHeadingText(scene)
				}
			]
		});

		for (const item of scene.content) {
			const node: JSONContent = {
				type: item.type,
				attrs: {
					element_id: item.element_id,
					...(item.type === 'character' || item.type === 'dialogue'
						? { character_name: item.character_name }
						: {})
				},
				content: item.content
					? [{ type: 'text', text: item.content }]
					: undefined
			};
			content.push(node);
		}
	}

	return { type: 'doc', content };
}

function formatSceneHeadingText(scene: SceneRecord): string {
	const parts: string[] = [];
	if (scene.scene_number != null) parts.push(`${scene.scene_number}.`);
	if (scene.int_ext) parts.push(`${scene.int_ext}.`);
	if (scene.location) parts.push(scene.location);
	const prefix = parts.join(' ');
	if (scene.time_of_day) return `${prefix} - ${scene.time_of_day}`;
	return prefix;
}

/**
 * Extract scene and content records from a TipTap document JSON.
 * Used in unit tests to verify document-to-records mapping.
 */
export interface ExtractedScene {
	element_id: string;
	scene_number: number | null;
	int_ext: string | null;
	location: string | null;
	time_of_day: string | null;
	order_index: number;
}

export interface ExtractedContent {
	element_id: string;
	type: string;
	content: string;
	character_name: string | null;
	scene_element_id: string;
	order_index: number;
}

export function documentToRecords(doc: JSONContent): {
	scenes: ExtractedScene[];
	contents: ExtractedContent[];
} {
	const scenes: ExtractedScene[] = [];
	const contents: ExtractedContent[] = [];
	let currentSceneElementId: string | null = null;
	let sceneOrderIndex = 0;
	let contentOrderIndex = 0;
	let currentCharacterName: string | null = null;

	for (const node of doc.content ?? []) {
		const elementId = node.attrs?.element_id as string | undefined;
		if (!elementId) continue;

		if (node.type === 'sceneHeading') {
			scenes.push({
				element_id: elementId,
				scene_number: (node.attrs?.scene_number as number) ?? null,
				int_ext: (node.attrs?.int_ext as string) ?? null,
				location: (node.attrs?.location as string) ?? null,
				time_of_day: (node.attrs?.time_of_day as string) ?? null,
				order_index: sceneOrderIndex
			});
			currentSceneElementId = elementId;
			sceneOrderIndex++;
			contentOrderIndex = 0;
			currentCharacterName = null;
		} else if (currentSceneElementId) {
			const text = getNodeText(node);
			let characterName: string | null = null;

			if (node.type === 'character') {
				characterName = text.trim().toUpperCase();
				currentCharacterName = characterName;
			} else if (node.type === 'dialogue') {
				characterName = currentCharacterName;
			}

			contents.push({
				element_id: elementId,
				type: node.type!,
				content: text,
				character_name: characterName,
				scene_element_id: currentSceneElementId,
				order_index: contentOrderIndex
			});
			contentOrderIndex++;
		}
	}

	return { scenes, contents };
}

function getNodeText(node: JSONContent): string {
	if (node.text) return node.text;
	if (!node.content) return '';
	return node.content.map(getNodeText).join('');
}
