<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, type JSONContent } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { SceneHeading } from '$lib/script/extensions/scene-heading.js';
	import { Action } from '$lib/script/extensions/action.js';
	import { Character } from '$lib/script/extensions/character.js';
	import { Dialogue } from '$lib/script/extensions/dialogue.js';
	import { Parenthetical } from '$lib/script/extensions/parenthetical.js';
	import { parseSceneHeading } from '$lib/script/parser.js';

	interface Props {
		scriptId: string;
		initialContent?: JSONContent | null;
		onUpdate?: (doc: JSONContent) => void;
	}

	let { scriptId, initialContent = null, onUpdate }: Props = $props();

	let editorElement: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();
	let activeNodeType: string = $state('action');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if (!editorElement) return;

		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit.configure({
					// Disable nodes we're replacing with screenplay-specific ones
					paragraph: false,
					heading: false,
					blockquote: false,
					bulletList: false,
					orderedList: false,
					listItem: false,
					codeBlock: false,
					horizontalRule: false
				}),
				SceneHeading,
				Action,
				Character,
				Dialogue,
				Parenthetical
			],
			content: initialContent ?? {
				type: 'doc',
				content: [
					{
						type: 'action',
						attrs: { element_id: crypto.randomUUID() },
						content: []
					}
				]
			},
			editorProps: {
				attributes: {
					class: 'script-editor-content'
				}
			},
			onTransaction: ({ editor: ed }) => {
				// Track active node type for the toolbar
				const sel = ed.state.selection;
				const node = sel.$from.parent;
				activeNodeType = node.type.name;
			},
			onUpdate: ({ editor: ed }) => {
				const doc = ed.getJSON();

				// Update scene heading attrs from parsed text
				updateSceneHeadingAttrs(ed);

				// Debounced sync
				if (debounceTimer) clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					onUpdate?.(doc);
				}, 1000);
			}
		});
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		editor?.destroy();
	});

	function updateSceneHeadingAttrs(ed: Editor) {
		const { doc } = ed.state;
		const { tr } = ed.state;
		let modified = false;

		doc.forEach((node, pos) => {
			if (node.type.name === 'sceneHeading') {
				const text = node.textContent;
				const parsed = parseSceneHeading(text);
				const attrs = node.attrs;

				if (
					attrs.scene_number !== parsed.scene_number ||
					attrs.int_ext !== parsed.int_ext ||
					attrs.location !== parsed.location ||
					attrs.time_of_day !== parsed.time_of_day
				) {
					tr.setNodeMarkup(pos, undefined, {
						...attrs,
						scene_number: parsed.scene_number,
						int_ext: parsed.int_ext,
						location: parsed.location,
						time_of_day: parsed.time_of_day
					});
					modified = true;
				}
			}
		});

		if (modified) {
			ed.view.dispatch(tr);
		}
	}

	function setNodeType(type: string) {
		if (!editor) return;

		switch (type) {
			case 'sceneHeading':
				editor.commands.setSceneHeading();
				break;
			case 'action':
				editor.commands.setAction();
				break;
			case 'character':
				editor.commands.setCharacter();
				break;
			case 'dialogue':
				editor.commands.setDialogue();
				break;
			case 'parenthetical':
				editor.commands.setParenthetical();
				break;
		}
		editor.commands.focus();
	}

	const nodeTypes = [
		{ id: 'sceneHeading', label: 'Scene' },
		{ id: 'action', label: 'Action' },
		{ id: 'character', label: 'Character' },
		{ id: 'dialogue', label: 'Dialogue' },
		{ id: 'parenthetical', label: 'Paren' }
	] as const;
</script>

<div class="flex h-full flex-col">
	<!-- Toolbar -->
	<div class="flex gap-1 border-b border-zinc-800 px-3 py-1.5">
		{#each nodeTypes as nt}
			<button
				class="rounded px-2 py-0.5 text-xs transition-colors {activeNodeType === nt.id
					? 'bg-zinc-700 text-zinc-100'
					: 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}"
				onclick={() => setNodeType(nt.id)}
			>
				{nt.label}
			</button>
		{/each}
	</div>

	<!-- Editor area -->
	<div class="flex-1 overflow-y-auto">
		<div bind:this={editorElement} class="script-editor mx-auto max-w-2xl px-6 py-8" data-script-id={scriptId}></div>
	</div>
</div>
