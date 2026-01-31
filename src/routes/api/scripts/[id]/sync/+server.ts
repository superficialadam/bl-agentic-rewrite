import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { traced } from '$lib/server/trace.js';

interface TipTapNode {
	type: string;
	attrs?: Record<string, unknown>;
	content?: TipTapNode[];
	text?: string;
}

function getNodeText(node: TipTapNode): string {
	if (node.text) return node.text;
	if (!node.content) return '';
	return node.content.map(getNodeText).join('');
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const scriptId = params.id;
	const body = await request.json();
	const document: TipTapNode = body.document;

	if (!document || !document.content) {
		error(400, 'document is required');
	}

	const result = await traced(locals.traceId, 'syncScript', 'mutation', async () => {
		const elementIds: string[] = [];
		let scenesUpserted = 0;
		let contentUpserted = 0;
		let currentSceneId: string | null = null;
		let currentCharacterName: string | null = null;
		let sceneOrderIndex = 0;
		let contentOrderIndex = 0;

		for (const node of document.content!) {
			const elementId = (node.attrs?.element_id as string) ?? null;
			if (!elementId) continue;

			elementIds.push(elementId);

			if (node.type === 'sceneHeading') {
				const text = getNodeText(node);
				const sceneNumber = (node.attrs?.scene_number as number) ?? null;
				const intExt = (node.attrs?.int_ext as string) ?? null;
				const location = (node.attrs?.location as string) ?? null;
				const timeOfDay = (node.attrs?.time_of_day as string) ?? null;

				const { data: scene, error: sceneErr } = await locals.supabase
					.from('rewrite_scenes')
					.upsert(
						{
							script_id: scriptId,
							element_id: elementId,
							scene_number: sceneNumber,
							int_ext: intExt,
							location,
							time_of_day: timeOfDay,
							order_index: sceneOrderIndex
						},
						{ onConflict: 'element_id' }
					)
					.select('id')
					.single();

				if (sceneErr) throw sceneErr;
				currentSceneId = scene.id;
				sceneOrderIndex++;
				contentOrderIndex = 0;
				currentCharacterName = null;
				scenesUpserted++;
			} else if (currentSceneId) {
				// action, character, dialogue, parenthetical
				const text = getNodeText(node);
				let characterName: string | null = null;

				if (node.type === 'character') {
					characterName = text.trim().toUpperCase();
					currentCharacterName = characterName;
				} else if (node.type === 'dialogue') {
					characterName = currentCharacterName;
				}

				const { error: contentErr } = await locals.supabase
					.from('rewrite_scene_content')
					.upsert(
						{
							scene_id: currentSceneId,
							element_id: elementId,
							type: node.type,
							content: text,
							character_name: characterName,
							order_index: contentOrderIndex
						},
						{ onConflict: 'element_id' }
					);

				if (contentErr) throw contentErr;
				contentOrderIndex++;
				contentUpserted++;
			}
		}

		// Delete orphaned scenes (element_ids in DB but not in document)
		// scene_content cascades on scene delete
		let orphansDeleted = 0;

		const { data: existingScenes } = await locals.supabase
			.from('rewrite_scenes')
			.select('id, element_id')
			.eq('script_id', scriptId);

		const orphanSceneIds: string[] = [];
		const remainingSceneIds: string[] = [];
		for (const scene of existingScenes ?? []) {
			if (!elementIds.includes(scene.element_id)) {
				orphanSceneIds.push(scene.id);
			} else {
				remainingSceneIds.push(scene.id);
			}
		}

		if (orphanSceneIds.length > 0) {
			const { count } = await locals.supabase
				.from('rewrite_scenes')
				.delete({ count: 'exact' })
				.in('id', orphanSceneIds);

			orphansDeleted += count ?? 0;
		}

		// Delete orphaned content within remaining scenes
		if (remainingSceneIds.length > 0) {
			const { data: existingContent } = await locals.supabase
				.from('rewrite_scene_content')
				.select('id, element_id')
				.in('scene_id', remainingSceneIds);

			const orphanContentIds: string[] = [];
			for (const content of existingContent ?? []) {
				if (!elementIds.includes(content.element_id)) {
					orphanContentIds.push(content.id);
				}
			}

			if (orphanContentIds.length > 0) {
				const { count } = await locals.supabase
					.from('rewrite_scene_content')
					.delete({ count: 'exact' })
					.in('id', orphanContentIds);

				orphansDeleted += count ?? 0;
			}
		}

		return {
			success: true,
			scenes_upserted: scenesUpserted,
			content_upserted: contentUpserted,
			orphans_deleted: orphansDeleted
		};
	});

	return json(result);
};
