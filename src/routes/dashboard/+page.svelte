<script lang="ts">
  import type { PageServerData } from './$types';
  import PulseChart from '$lib/components/PulseChart.svelte';
  import ReflectionFeed from '$lib/components/ReflectionFeed.svelte';
  import WeeklySummary from '$lib/components/WeeklySummary.svelte';

  let { data }: { data: PageServerData } = $props();

  function avg(field: string): number | null {
    if (!data.weekCheckins.length) return null;
    const sum = data.weekCheckins.reduce((acc: number, c: any) => acc + c[field], 0);
    return sum / data.weekCheckins.length;
  }

  function scoreColor(val: number | null): string {
    if (val === null) return '';
    if (val >= 4) return 'score-green';
    if (val >= 3) return 'score-yellow';
    return 'score-red';
  }

  const dimensions = $derived([
    { key: 'clarityScore', label: 'Clarity', hint: "Do we know what we're building?", avg: avg('clarityScore') },
    { key: 'executionScore', label: 'Execution', hint: 'Is work flowing smoothly?', avg: avg('executionScore') },
    { key: 'qualityScore', label: 'Quality', hint: 'Are issues piling up?', avg: avg('qualityScore') },
  ]);
</script>

<div class="dashboard-view">
  <h1>Dashboard</h1>
  <p class="subtitle">Your team's product pulse at a glance.</p>

  <section class="pulse-overview">
    <h2 class="section-title">This week's pulse</h2>
    <div class="score-cards">
      {#each dimensions as dim}
        <div class="score-card card">
          <span class="score-label">{dim.label}</span>
          <span class="score-value {scoreColor(dim.avg)}">
            {dim.avg !== null ? dim.avg.toFixed(1) : '—'}
          </span>
          <span class="score-hint">{dim.hint}</span>
        </div>
      {/each}
    </div>
    <p class="responses-count">
      {data.weekCheckins.length} / {data.memberCount} check-ins this week
    </p>
  </section>

  <section class="trend-section">
    <h2 class="section-title">Trends (last 8 weeks)</h2>
    <PulseChart data={data.trendData} />
  </section>

  <section class="reflections-section">
    <h2 class="section-title">Reflections</h2>
    <ReflectionFeed checkins={data.weekCheckins} />
  </section>

  {#if data.team?.discordWebhookUrl}
    <section class="discord-section">
      <WeeklySummary
        teamId={data.team.id}
        weekOf={data.currentWeek}
        {dimensions}
        responseCount={data.weekCheckins.length}
        memberCount={data.memberCount}
        checkins={data.weekCheckins}
      />
    </section>
  {/if}
</div>

<style>
  .dashboard-view h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 2rem; }

  .score-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .score-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-align: center;
  }

  .score-label { font-weight: 600; font-size: 0.875rem; }

  .score-value { font-size: 2.5rem; font-weight: 700; line-height: 1; }
  .score-green { color: var(--neon-green); text-shadow: 0 0 12px rgba(57, 255, 20, 0.3); }
  .score-yellow { color: var(--neon-yellow); text-shadow: 0 0 12px rgba(245, 245, 32, 0.3); }
  .score-red { color: var(--neon-red); text-shadow: 0 0 12px rgba(255, 23, 68, 0.3); }

  .score-hint { font-size: 0.75rem; color: var(--text-muted); }

  .responses-count {
    text-align: center;
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  section + section { margin-top: 2rem; }
</style>
