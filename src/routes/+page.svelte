<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let newName = $state('');
	let creating = $state(false);

	async function createProject() {
		const name = newName.trim();
		if (!name || creating) return;

		creating = true;
		try {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message ?? 'Failed to create project');
			}

			const project = await res.json();
			window.location.href = `/${project.slug}/create`;
		} finally {
			creating = false;
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	<header class="border-b border-zinc-800 px-8 py-4">
		<h1 class="text-xl font-semibold tracking-tight">Creator Studio</h1>
	</header>

	<main class="mx-auto max-w-2xl px-8 py-12">
		<div class="mb-8">
			<h2 class="mb-4 text-lg font-medium">New Project</h2>
			<form
				class="flex gap-3"
				onsubmit={(e) => {
					e.preventDefault();
					createProject();
				}}
			>
				<input
					type="text"
					bind:value={newName}
					placeholder="Project name"
					class="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
				/>
				<button
					type="submit"
					disabled={!newName.trim() || creating}
					class="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
				>
					{creating ? 'Creating…' : 'Create'}
				</button>
			</form>
		</div>

		{#if data.projects.length > 0}
			<h2 class="mb-4 text-lg font-medium">Projects</h2>
			<ul class="space-y-2">
				{#each data.projects as project}
					<li>
						<a
							href="/{project.slug}/create"
							class="flex items-center justify-between rounded-md border border-zinc-800 px-4 py-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
						>
							<span class="font-medium">{project.name}</span>
							<span class="text-xs text-zinc-500">{formatDate(project.updated_at)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-zinc-500">No projects yet. Create one above.</p>
		{/if}
	</main>
</div>
