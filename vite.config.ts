/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '0.0.0.0'
	},
	test: {
		include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
		passWithNoTests: true
	}
});
