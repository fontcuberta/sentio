<script lang="ts">
  import { onMount } from 'svelte';
  import * as Plot from '@observablehq/plot';

  let { checkins = [] }: { checkins: { tag: string | null }[] } = $props();
  let container = $state<HTMLDivElement>(undefined!);

  const tagColors: Record<string, string> = {
    momentum: '#39ff14',
    risk: '#f5f520',
    blocked: '#ff1744',
    neutral: '#7a7a8e',
  };

  function renderChart() {
    if (!container) return;
    container.innerHTML = '';

    const counts: Record<string, number> = {};
    for (const c of checkins) {
      const t = c.tag || 'neutral';
      counts[t] = (counts[t] || 0) + 1;
    }

    const data = Object.entries(counts).map(([tag, count]) => ({ tag, count }));
    if (!data.length) return;

    const chart = Plot.plot({
      width: container.clientWidth,
      height: 200,
      marginLeft: 80,
      marginRight: 16,
      x: { label: 'Count', grid: true },
      y: { label: null, padding: 0.3 },
      color: {
        domain: Object.keys(tagColors),
        range: Object.values(tagColors),
      },
      marks: [
        Plot.barX(data, {
          x: 'count',
          y: 'tag',
          fill: 'tag',
          sort: { y: '-x' },
          rx: 4,
        }),
        Plot.text(data, {
          x: 'count',
          y: 'tag',
          text: (d: { count: number }) => String(d.count),
          dx: 14,
          fill: '#e4e4ef',
          fontSize: 13,
          fontWeight: '600',
        }),
        Plot.ruleX([0]),
      ],
    });

    container.appendChild(chart);
  }

  onMount(() => renderChart());

  $effect(() => {
    if (checkins) renderChart();
  });
</script>

<div class="tag-distribution">
  {#if !checkins.length}
    <div class="empty">
      <p>No check-in data yet.</p>
    </div>
  {:else}
    <div bind:this={container} class="chart-container"></div>
  {/if}
</div>

<style>
  .chart-container {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
  }

  .empty {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-muted);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
</style>
