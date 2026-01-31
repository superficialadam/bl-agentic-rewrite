import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		dialogue: {
			setDialogue: () => ReturnType;
		};
	}
}

export const Dialogue = Node.create({
	name: 'dialogue',
	group: 'block',
	content: 'inline*',

	addAttributes() {
		return {
			element_id: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-element-id'),
				renderHTML: (attributes) => ({
					'data-element-id': attributes.element_id
				})
			},
			character_name: {
				default: null
			}
		};
	},

	parseHTML() {
		return [{ tag: 'p[data-type="dialogue"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'p',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'dialogue',
				class: 'script-dialogue'
			}),
			0
		];
	},

	addCommands() {
		return {
			setDialogue:
				() =>
				({ commands }) => {
					return commands.setNode(this.name, { element_id: crypto.randomUUID() });
				}
		};
	}
});
