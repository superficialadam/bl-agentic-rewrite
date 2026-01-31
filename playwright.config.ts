import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/missions',
	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: true
	}
});
