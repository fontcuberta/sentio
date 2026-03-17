<script lang="ts">
  let {
    teamId = '',
    weekOf = '',
    dimensions = [],
    responseCount = 0,
    memberCount = 0,
    checkins = []
  }: {
    teamId: string;
    weekOf: string;
    dimensions: { label: string; avg: number | null }[];
    responseCount: number;
    memberCount: number;
    checkins: any[];
  } = $props();

  let sending = $state(false);
  let sent = $state(false);
  let errorMsg = $state('');

  function formatWeek(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const summaryText = $derived(() => {
    const lines = [`Sentio — Week of ${formatWeek(weekOf)}`];
    lines.push('');

    for (const dim of dimensions) {
      const val = dim.avg !== null ? dim.avg.toFixed(1) : '—';
      lines.push(`${dim.label}: ${val} / 5`);
    }
    lines.push(`Responses: ${responseCount} / ${memberCount}`);
    lines.push('');

    const reflections = checkins.filter((c: any) => c.reflection).slice(0, 3);
    if (reflections.length) {
      lines.push('Top reflections:');
      for (const c of reflections) {
        const text = c.reflection.length > 120 ? c.reflection.slice(0, 120) + '...' : c.reflection;
        lines.push(`• "${text}"`);
      }
      lines.push('');
    }

    const tags: Record<string, number> = {};
    for (const c of checkins) {
      if (c.tag) tags[c.tag] = (tags[c.tag] || 0) + 1;
    }
    const tagParts = Object.entries(tags).map(([t, n]) => `${n} ${t}`);
    if (tagParts.length) lines.push(`Tags: ${tagParts.join(', ')}`);

    return lines.join('\n');
  });

  async function sendToDiscord() {
    sending = true;
    errorMsg = '';
    sent = false;

    try {
      const res = await fetch('/api/discord-pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, week_of: weekOf })
      });

      const resBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resBody.error || `Failed (status ${res.status})`);
      }

      sent = true;
      setTimeout(() => { sent = false; }, 3000);
    } catch (err: any) {
      errorMsg = err.message || 'Failed to send to Discord';
    } finally {
      sending = false;
    }
  }
</script>

<div class="weekly-summary card">
  <h3 class="section-title">Share to Discord</h3>
  <p class="hint">Post this week's product pulse to your Discord channel.</p>

  <div class="preview">
    <pre>{summaryText()}</pre>
  </div>

  <button class="btn btn-primary" disabled={sending} onclick={sendToDiscord}>
    {sending ? 'Sending...' : sent ? 'Sent!' : 'Send to Discord'}
  </button>

  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {/if}
</div>

<style>
  .weekly-summary { display: flex; flex-direction: column; gap: 0.75rem; }
  .hint { color: var(--text-muted); font-size: 0.875rem; }

  .preview {
    background: var(--bg);
    color: var(--text-muted);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    border: 1px solid var(--border);
  }

  .preview pre {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.8125rem;
    white-space: pre-wrap;
    line-height: 1.6;
  }
</style>
