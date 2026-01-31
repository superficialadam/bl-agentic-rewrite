import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		action: {
			setAction: () => ReturnType;
		};
	}
}

export const Action = Node.create({
	name: 'action',
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
		return [{ tag: 'p[data-type="action"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'p',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'action',
				class: 'script-action'
			}),
			0
		];
	},

	addCommands() {
		return {
			setAction:
				() =>
				({ commands }) => {
					return commands.setNode(this.name, { element_id: crypto.randomUUID() });
				}
		};
	}
});
