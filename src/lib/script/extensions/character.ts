import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		character: {
			setCharacter: () => ReturnType;
		};
	}
}

export const Character = Node.create({
	name: 'character',
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
		return [{ tag: 'p[data-type="character"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'p',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'character',
				class: 'script-character'
			}),
			0
		];
	},

	addCommands() {
		return {
			setCharacter:
				() =>
				({ commands }) => {
					return commands.setNode(this.name, { element_id: crypto.randomUUID() });
				}
		};
	}
});
