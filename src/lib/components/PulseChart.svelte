<script lang="ts">
  import { onMount } from 'svelte';
  import * as Plot from '@observablehq/plot';

  let { data = [] }: { data: { week: string; dimension: string; avg: number; min: number; max: number }[] } = $props();
  let container = $state<HTMLDivElement>(undefined!);

  const colors: Record<string, string> = {
    clarity: '#00f0ff',
    execution: '#39ff14',
    quality: '#ff2eaa',
  };

  function renderChart() {
    if (!container || !data.length) return;
    container.innerHTML = '';

    const chart = Plot.plot({
      width: container.clientWidth,
      height: 300,
      marginLeft: 40,
      marginBottom: 40,
      y: { domain: [0, 5], label: 'Score', grid: true },
      x: { label: 'Week', type: 'band' },
      color: {
        domain: ['clarity', 'execution', 'quality'],
        range: [colors.clarity, colors.execution, colors.quality],
        legend: true,
      },
      marks: [
        Plot.areaY(data, {
          x: 'week', y1: 'min', y2: 'max',
          fill: 'dimension', fillOpacity: 0.1,
        }),
        Plot.lineY(data, {
          x: 'week', y: 'avg', stroke: 'dimension',
          strokeWidth: 2.5, curve: 'catmull-rom',
        }),
        Plot.dot(data, {
          x: 'week', y: 'avg', fill: 'dimension', r: 4,
        }),
        Plot.ruleY([3], { stroke: '#2a2a3a', strokeDasharray: '4,4' }),
      ],
    });

    container.appendChild(chart);
  }

  onMount(() => renderChart());

  $effect(() => {
    if (data) renderChart();
  });
</script>

<div class="pulse-chart">
  {#if !data.length}
    <div class="empty-chart">
      <p>No trend data yet. Check-ins will appear here after the first week.</p>
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

  .empty-chart {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
</style>
