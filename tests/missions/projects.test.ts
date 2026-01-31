import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function psql(query: string): string {
	return execSync(`psql "${DB_URL}" -t -A -q -c "${query.replace(/"/g, '\\"')}"`, {
		encoding: 'utf-8'
	}).trim();
}

test.describe('Project CRUD', () => {
	const testSlugs: string[] = [];

	test.afterAll(async () => {
		for (const slug of testSlugs) {
			try {
				// Null out FKs first, then delete in dependency order
				psql(`UPDATE rewrite_projects SET current_script_id = NULL, current_timeline_id = NULL WHERE slug LIKE '${slug}%'`);
				psql(`DELETE FROM rewrite_tracks WHERE timeline_id IN (SELECT id FROM rewrite_timelines WHERE project_id IN (SELECT id FROM rewrite_projects WHERE slug LIKE '${slug}%'))`);
				psql(`DELETE FROM rewrite_timelines WHERE project_id IN (SELECT id FROM rewrite_projects WHERE slug LIKE '${slug}%')`);
				psql(`DELETE FROM rewrite_scripts WHERE project_id IN (SELECT id FROM rewrite_projects WHERE slug LIKE '${slug}%')`);
				psql(`DELETE FROM rewrite_projects WHERE slug LIKE '${slug}%'`);
			} catch {
				// best effort cleanup
			}
		}
	});

	test('create project via API and verify DB row', async ({ request }) => {
		const name = `Test Project ${Date.now()}`;
		const res = await request.post('/api/projects', {
			data: { name }
		});

		expect(res.status()).toBe(201);
		const project = await res.json();
		testSlugs.push(project.slug);

		expect(project.name).toBe(name);
		expect(project.slug).toBeTruthy();
		expect(project.current_script_id).toBeTruthy();
		expect(project.current_timeline_id).toBeTruthy();

		// Verify project row in DB
		const dbName = psql(`SELECT name FROM rewrite_projects WHERE slug = '${project.slug}'`);
		expect(dbName).toBe(name);

		// Verify script was created
		const scriptTitle = psql(`SELECT title FROM rewrite_scripts WHERE project_id = '${project.id}'`);
		expect(scriptTitle).toBe('Untitled Script');

		// Verify timeline was created
		const tlName = psql(`SELECT name FROM rewrite_timelines WHERE project_id = '${project.id}'`);
		expect(tlName).toBe('Main Timeline');

		// Verify default tracks (V1 video, A1 audio)
		const tracks = psql(`SELECT name || ':' || type FROM rewrite_tracks WHERE timeline_id = '${project.current_timeline_id}' ORDER BY order_index`);
		expect(tracks).toBe('V1:video\nA1:audio');
	});

	test('project list page loads and shows projects', async ({ page }) => {
		const name = `Listed Project ${Date.now()}`;
		const res = await page.request.post('/api/projects', {
			data: { name }
		});
		const project = await res.json();
		testSlugs.push(project.slug);

		await page.goto('/');
		await expect(page.locator('h1')).toHaveText('Creator Studio');
		await expect(page.locator(`a[href="/${project.slug}/create"]`)).toBeVisible();
	});

	test('project create page shows three-panel layout', async ({ page }) => {
		const name = `Layout Project ${Date.now()}`;
		const res = await page.request.post('/api/projects', {
			data: { name }
		});
		const project = await res.json();
		testSlugs.push(project.slug);

		await page.goto(`/${project.slug}/create`);
		await expect(page.getByText('Scenes', { exact: true })).toBeVisible();
		await expect(page.getByText('Script', { exact: true })).toBeVisible();
		await expect(page.getByText('Characters', { exact: true })).toBeVisible();
		await expect(page.getByText('Timeline', { exact: true })).toBeVisible();
		await expect(page.getByText(name)).toBeVisible();
	});

	test('rejects empty project name with 400', async ({ request }) => {
		const res = await request.post('/api/projects', {
			data: { name: '' }
		});
		expect(res.status()).toBe(400);
	});
});
