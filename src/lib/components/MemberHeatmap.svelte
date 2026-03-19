<script lang="ts">
  type Checkin = {
    displayName: string;
    clarityScore: number;
    executionScore: number;
    qualityScore: number;
  };

  let { checkins = [] }: { checkins: Checkin[] } = $props();

  const dims = ['clarityScore', 'executionScore', 'qualityScore'] as const;
  const dimLabels: Record<string, string> = {
    clarityScore: 'Clarity',
    executionScore: 'Execution',
    qualityScore: 'Quality',
  };

  function cellColor(val: number): string {
    if (val >= 4) return 'var(--neon-green)';
    if (val >= 3) return 'var(--neon-yellow)';
    return 'var(--neon-red)';
  }

  function cellBg(val: number): string {
    if (val >= 4) return 'rgba(57, 255, 20, 0.12)';
    if (val >= 3) return 'rgba(245, 245, 32, 0.10)';
    return 'rgba(255, 23, 68, 0.10)';
  }
</script>

<div class="heatmap-container">
  {#if !checkins.length}
    <p class="empty">No check-in data this week.</p>
  {:else}
    <div class="heatmap-scroll">
      <table class="heatmap">
        <thead>
          <tr>
            <th class="member-col">Member</th>
            {#each dims as d}
              <th>{dimLabels[d]}</th>
            {/each}
            <th>Avg</th>
          </tr>
        </thead>
        <tbody>
          {#each checkins as row}
            {@const memberAvg = (row.clarityScore + row.executionScore + row.qualityScore) / 3}
            <tr>
              <td class="member-name">{row.displayName}</td>
              {#each dims as d}
                <td>
                  <span class="cell" style="color: {cellColor(row[d])}; background: {cellBg(row[d])}">
                    {row[d]}
                  </span>
                </td>
              {/each}
              <td>
                <span class="cell" style="color: {cellColor(memberAvg)}; background: {cellBg(memberAvg)}">
                  {memberAvg.toFixed(1)}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .heatmap-container {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    overflow-x: auto;
  }

  .heatmap {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .heatmap th {
    text-align: center;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .member-col { text-align: left !important; }

  .heatmap td {
    text-align: center;
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid rgba(42, 42, 58, 0.4);
    transition: background var(--motion-duration) var(--motion-ease), box-shadow var(--motion-duration) var(--motion-ease);
  }

  .heatmap tbody tr:hover td {
    background: rgba(0, 240, 255, 0.03);
    box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.12);
  }

  .heatmap tbody tr:hover .member-name {
    color: var(--accent);
  }

  .member-name {
    text-align: left;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
  }

  .cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2rem;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .empty {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-muted);
  }
</style>
