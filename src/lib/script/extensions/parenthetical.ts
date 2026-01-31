import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		parenthetical: {
			setParenthetical: () => ReturnType;
		};
	}
}

export const Parenthetical = Node.create({
	name: 'parenthetical',
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
			}
		};
	},

	parseHTML() {
		return [{ tag: 'p[data-type="parenthetical"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'p',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'parenthetical',
				class: 'script-parenthetical'
			}),
			0
		];
	},

	addCommands() {
		return {
			setParenthetical:
				() =>
				({ commands }) => {
					return commands.setNode(this.name, { element_id: crypto.randomUUID() });
				}
		};
	}
});
