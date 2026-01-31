<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex h-screen flex-col bg-zinc-950 text-zinc-100">
	<!-- Top bar -->
	<header class="flex h-10 shrink-0 items-center border-b border-zinc-800 px-4">
		<a href="/" class="text-sm text-zinc-400 hover:text-zinc-200">← Projects</a>
		<span class="mx-3 text-zinc-700">/</span>
		<span class="text-sm font-medium">{data.project.name}</span>
	</header>

	<!-- Three-panel layout -->
	<div class="flex min-h-0 flex-1">
		<!-- Left panel: Outliner -->
		<aside class="flex w-56 shrink-0 flex-col border-r border-zinc-800">
			<div class="border-b border-zinc-800 px-3 py-2">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Scenes</span>
			</div>
			<div class="flex-1 overflow-y-auto p-2">
				<p class="text-xs text-zinc-600">No scenes yet</p>
			</div>
		</aside>

		<!-- Center panel: Editor -->
		<main class="flex min-w-0 flex-1 flex-col">
			<div class="border-b border-zinc-800 px-4 py-2">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Script</span>
			</div>
			<div class="flex-1 overflow-y-auto p-6">
				<p class="text-sm text-zinc-600">Editor will load here</p>
			</div>
		</main>

		<!-- Right panel: Characters -->
		<aside class="flex w-64 shrink-0 flex-col border-l border-zinc-800">
			<div class="border-b border-zinc-800 px-3 py-2">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Characters</span>
			</div>
			<div class="flex-1 overflow-y-auto p-2">
				<p class="text-xs text-zinc-600">No characters detected</p>
			</div>
		</aside>
	</div>

	<!-- Bottom: Timeline -->
	<div class="h-48 shrink-0 border-t border-zinc-800">
		<div class="border-b border-zinc-800 px-4 py-2">
			<span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Timeline</span>
		</div>
		<div class="p-4">
			<p class="text-xs text-zinc-600">Timeline will render here</p>
		</div>
	</div>
</div>
