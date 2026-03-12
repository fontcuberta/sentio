<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageServerData, ActionData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();

  const existing = data.existing;
  let clarity = $state(existing?.clarityScore ?? 3);
  let execution = $state(existing?.executionScore ?? 3);
  let quality = $state(existing?.qualityScore ?? 3);
  let reflection = $state(existing?.reflection ?? '');
  let tag = $state(existing?.tag ?? '');

  const dimensions = [
    { key: 'clarity', label: 'Clarity', hint: "Do we know what we're building and why?", get value() { return clarity; }, set value(v: number) { clarity = v; } },
    { key: 'execution', label: 'Execution', hint: 'Is work flowing smoothly?', get value() { return execution; }, set value(v: number) { execution = v; } },
    { key: 'quality', label: 'Quality', hint: 'Are bugs, debt, or issues piling up?', get value() { return quality; }, set value(v: number) { quality = v; } },
  ];

  const tagOptions = ['momentum', 'risk', 'blocked', 'neutral'];
</script>

<div class="checkin-view">
  <h1>Weekly Check-in</h1>
  <p class="subtitle">How are things going this week? Takes about 60 seconds.</p>

  {#if data.existing}
    <div class="revision-notice">
      You already checked in this week. Submitting will update your response.
    </div>
  {/if}

  <form method="post" action="?/submit" class="checkin-form card" use:enhance>
    <input type="hidden" name="teamId" value={data.teamId} />

    {#each dimensions as dim}
      <div class="dimension">
        <div class="dimension-header">
          <label for={dim.key}>{dim.label}</label>
          <span class="dimension-value">{dim.value}</span>
        </div>
        <p class="dimension-hint">{dim.hint}</p>
        <input
          id={dim.key}
          name={dim.key + 'Score'}
          type="range" min="1" max="5" step="1"
          bind:value={dim.value}
          class="slider"
        />
        <div class="slider-labels">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div>
    {/each}

    <div class="field">
      <label for="reflection">What's actually happening this week?</label>
      <textarea
        id="reflection" name="reflection"
        placeholder="Share what's going on — roadmap clarity, shipping pace, team energy, anything relevant..."
        rows="4" minlength="10" maxlength="500" required
        bind:value={reflection}
      ></textarea>
      <span class="char-count">{reflection.length} / 500</span>
    </div>

    <div class="field">
      <span class="field-label">How would you tag this week? <span class="optional">(optional)</span></span>
      <input type="hidden" name="tag" value={tag} />
      <div class="tag-options">
        {#each tagOptions as t}
          <button
            type="button"
            class="tag-pill {tag === t ? 'active' : ''} tag-{t}"
            onclick={() => tag = tag === t ? '' : t}
          >
            {t}
          </button>
        {/each}
      </div>
    </div>

    <button type="submit" class="btn btn-primary submit-btn">
      {data.existing ? 'Update check-in' : 'Submit check-in'}
    </button>

    {#if form?.message}
      <p class="error">{form.message}</p>
    {/if}
  </form>
</div>

<style>
  .checkin-view h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 2rem; }

  .revision-notice {
    background: var(--accent-dim);
    color: var(--accent);
    padding: 0.625rem 1rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(0, 240, 255, 0.15);
  }

  .checkin-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 560px;
  }

  .dimension { display: flex; flex-direction: column; gap: 0.25rem; }

  .dimension-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .dimension-header label { font-weight: 600; }

  .dimension-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent);
    min-width: 2rem;
    text-align: right;
  }

  .dimension-hint { color: var(--text-muted); font-size: 0.8125rem; margin-bottom: 0.25rem; }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    outline: none;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 3px solid var(--bg-card);
    box-shadow: 0 0 10px var(--accent-glow);
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.6875rem;
    color: var(--text-muted);
    padding: 0 2px;
  }

  .field label, .field-label { font-weight: 600; display: block; margin-bottom: 0.5rem; }
  .optional { font-weight: 400; color: var(--text-muted); }

  .char-count {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: right;
    display: block;
    margin-top: 0.25rem;
  }

  .tag-options { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .tag-pill {
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1.5px solid var(--border);
    background: var(--bg-elevated);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    text-transform: capitalize;
    font-family: inherit;
    color: var(--text-muted);
    transition: all 0.2s;
  }
  .tag-pill:hover { border-color: var(--accent); color: var(--text); }
  .tag-pill.active.tag-momentum { background: rgba(57,255,20,0.1); border-color: var(--neon-green); color: var(--neon-green); box-shadow: 0 0 8px rgba(57,255,20,0.15); }
  .tag-pill.active.tag-risk { background: rgba(245,245,32,0.08); border-color: var(--neon-yellow); color: var(--neon-yellow); box-shadow: 0 0 8px rgba(245,245,32,0.12); }
  .tag-pill.active.tag-blocked { background: rgba(255,23,68,0.08); border-color: var(--neon-red); color: var(--neon-red); box-shadow: 0 0 8px rgba(255,23,68,0.12); }
  .tag-pill.active.tag-neutral { background: rgba(122,122,142,0.1); border-color: var(--text-muted); color: var(--text-muted); }

  .submit-btn { width: 100%; padding: 0.75rem; font-size: 1rem; }
</style>
