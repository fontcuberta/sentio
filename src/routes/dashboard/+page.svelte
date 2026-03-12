<script lang="ts">
  import type { PageServerData } from './$types';
  import PulseChart from '$lib/components/PulseChart.svelte';
  import RadarChart from '$lib/components/RadarChart.svelte';
  import MemberHeatmap from '$lib/components/MemberHeatmap.svelte';
  import TagDistribution from '$lib/components/TagDistribution.svelte';
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

  function delta(current: number | null, previous: number | null): string {
    if (current === null || previous === null) return '';
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return '→';
    return diff > 0 ? `▲ ${diff.toFixed(1)}` : `▼ ${Math.abs(diff).toFixed(1)}`;
  }

  function deltaClass(current: number | null, previous: number | null): string {
    if (current === null || previous === null) return '';
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return 'delta-flat';
    return diff > 0 ? 'delta-up' : 'delta-down';
  }

  const dimensions = $derived([
    { key: 'clarityScore', label: 'Clarity', hint: "Do we know what we're building?", avg: avg('clarityScore') },
    { key: 'executionScore', label: 'Execution', hint: 'Is work flowing smoothly?', avg: avg('executionScore') },
    { key: 'qualityScore', label: 'Quality', hint: 'Are issues piling up?', avg: avg('qualityScore') },
  ]);

  const wow = $derived(data.weekOverWeek);
</script>

<div class="dashboard-view">
  <div class="dash-header">
    <div>
      <h1>Dashboard</h1>
      <p class="subtitle">Your team's product pulse at a glance.</p>
    </div>
    {#if data.allTeams.length > 1}
      <select
        class="team-select"
        value={data.team?.id}
        onchange={(e) => {
          const target = e.currentTarget as HTMLSelectElement;
          window.location.href = `/dashboard?team=${target.value}`;
        }}
      >
        {#each data.allTeams as t}
          <option value={t.id}>{t.name}</option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- Score cards with week-over-week delta -->
  <section class="pulse-overview">
    <h2 class="section-title">This week's pulse</h2>
    <div class="score-cards">
      {#each dimensions as dim}
        {@const wowKey = dim.key === 'clarityScore' ? 'clarity' : dim.key === 'executionScore' ? 'execution' : 'quality'}
        {@const d = delta(wow[wowKey].current, wow[wowKey].previous)}
        {@const dc = deltaClass(wow[wowKey].current, wow[wowKey].previous)}
        <div class="score-card card">
          <span class="score-label">{dim.label}</span>
          <span class="score-value {scoreColor(dim.avg)}">
            {dim.avg !== null ? dim.avg.toFixed(1) : '—'}
          </span>
          {#if d}
            <span class="delta {dc}">{d}</span>
          {/if}
          <span class="score-hint">{dim.hint}</span>
        </div>
      {/each}
    </div>
    <p class="responses-count">
      {data.weekCheckins.length} / {data.memberCount} check-ins this week
    </p>
  </section>

  <!-- Radar + Heatmap side by side -->
  <section class="two-col">
    <div class="col">
      <h2 class="section-title">Radar overview</h2>
      <RadarChart {dimensions} />
    </div>
    <div class="col">
      <h2 class="section-title">Member breakdown</h2>
      <MemberHeatmap checkins={data.weekCheckins} />
    </div>
  </section>

  <!-- Trends line chart -->
  <section class="trend-section">
    <h2 class="section-title">Trends (last 8 weeks)</h2>
    <PulseChart data={data.trendData} />
  </section>

  <!-- Tag distribution -->
  <section class="tag-section">
    <h2 class="section-title">Sentiment tags (all time)</h2>
    <TagDistribution checkins={data.allTagCheckins} />
  </section>

  <!-- Reflections -->
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
  .subtitle { color: var(--text-muted); margin-bottom: 0; }

  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .team-select {
    padding: 0.5rem 0.75rem;
    background: var(--bg-elevated);
    color: var(--accent);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    min-width: 160px;
  }
  .team-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

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

  .delta {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .delta-up { color: var(--neon-green); }
  .delta-down { color: var(--neon-red); }
  .delta-flat { color: var(--text-muted); }

  .score-hint { font-size: 0.75rem; color: var(--text-muted); }

  .responses-count {
    text-align: center;
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  @media (max-width: 768px) {
    .two-col { grid-template-columns: 1fr; }
  }

  section + section { margin-top: 2rem; }
</style>
