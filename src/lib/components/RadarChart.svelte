<script lang="ts">
  type DimensionData = {
    label: string;
    avg: number | null;
  };

  let { dimensions = [] }: { dimensions: DimensionData[] } = $props();

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 110;
  const levels = 5;

  const colors = {
    grid: '#2a2a3a',
    label: '#7a7a8e',
    fill: 'rgba(0, 240, 255, 0.15)',
    stroke: '#00f0ff',
    dot: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.5)',
  };

  function angleFor(i: number, total: number): number {
    return (Math.PI * 2 * i) / total - Math.PI / 2;
  }

  function pointAt(i: number, total: number, value: number): { x: number; y: number } {
    const angle = angleFor(i, total);
    const r = (value / 5) * maxRadius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const gridRings = $derived(
    Array.from({ length: levels }, (_, i) => {
      const r = ((i + 1) / levels) * maxRadius;
      const n = dimensions.length;
      return Array.from({ length: n }, (_, j) => {
        const angle = angleFor(j, n);
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
    })
  );

  const axisLines = $derived(
    dimensions.map((_, i) => {
      const angle = angleFor(i, dimensions.length);
      return {
        x2: cx + maxRadius * Math.cos(angle),
        y2: cy + maxRadius * Math.sin(angle),
      };
    })
  );

  const dataPoints = $derived(
    dimensions.map((d, i) => pointAt(i, dimensions.length, d.avg ?? 0))
  );

  const dataPolygon = $derived(
    dataPoints.map(p => `${p.x},${p.y}`).join(' ')
  );

  const labelPositions = $derived(
    dimensions.map((d, i) => {
      const angle = angleFor(i, dimensions.length);
      const r = maxRadius + 22;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        label: d.label,
        value: d.avg,
      };
    })
  );
</script>

<div class="radar-chart">
  {#if dimensions.every(d => d.avg === null)}
    <div class="empty-chart">
      <p>No check-in data this week.</p>
    </div>
  {:else}
    <svg viewBox="0 0 {size} {size}" width={size} height={size}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {#each gridRings as ring}
        <polygon points={ring} fill="none" stroke={colors.grid} stroke-width="0.5" />
      {/each}

      {#each axisLines as axis}
        <line x1={cx} y1={cy} x2={axis.x2} y2={axis.y2} stroke={colors.grid} stroke-width="0.5" />
      {/each}

      <polygon
        points={dataPolygon}
        fill={colors.fill}
        stroke={colors.stroke}
        stroke-width="2"
        filter="url(#glow)"
      />

      {#each dataPoints as point}
        <circle cx={point.x} cy={point.y} r="5" fill={colors.dot} filter="url(#glow)" />
      {/each}

      {#each labelPositions as lbl}
        <text
          x={lbl.x}
          y={lbl.y}
          fill={colors.label}
          font-size="11"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="Inter, sans-serif"
        >
          {lbl.label}
        </text>
        <text
          x={lbl.x}
          y={lbl.y + 14}
          fill={colors.stroke}
          font-size="13"
          font-weight="700"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="Inter, sans-serif"
        >
          {lbl.value !== null ? lbl.value.toFixed(1) : '—'}
        </text>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .radar-chart {
    display: flex;
    justify-content: center;
    padding: 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .radar-chart svg {
    max-width: 100%;
    height: auto;
  }

  .empty-chart {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
  }
</style>
