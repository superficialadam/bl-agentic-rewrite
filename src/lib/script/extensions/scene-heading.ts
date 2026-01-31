import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		sceneHeading: {
			setSceneHeading: () => ReturnType;
		};
	}
}

export const SceneHeading = Node.create({
	name: 'sceneHeading',
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
			scene_number: {
				default: null
			},
			int_ext: {
				default: null
			},
			location: {
				default: null
			},
			time_of_day: {
				default: null
			}
		};
	},

	parseHTML() {
		return [{ tag: 'h3[data-type="scene-heading"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'h3',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'scene-heading',
				class: 'scene-heading'
			}),
			0
		];
	},

	addCommands() {
		return {
			setSceneHeading:
				() =>
				({ commands }) => {
					return commands.setNode(this.name, { element_id: crypto.randomUUID() });
				}
		};
	}
});
