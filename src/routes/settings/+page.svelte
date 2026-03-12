<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageServerData, ActionData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  let copied = $state(false);

  function copyInviteCode() {
    navigator.clipboard.writeText(data.team.inviteCode);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<div class="settings-view">
  <h1>Team Settings</h1>
  <p class="subtitle">{data.team.name}</p>

  <section class="card invite-section">
    <h2 class="section-title">Invite code</h2>
    <p class="hint">Share this code with teammates so they can join.</p>
    <div class="invite-code-display">
      <code>{data.team.inviteCode}</code>
      <button class="btn btn-secondary" onclick={copyInviteCode}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  </section>

  {#if data.isAdmin}
    <section class="card discord-section">
      <h2 class="section-title">Discord integration</h2>
      <p class="hint">Add a Discord webhook URL to share your weekly pulse to a channel.</p>
      <form method="post" action="?/saveWebhook" use:enhance>
        <input type="hidden" name="teamId" value={data.team.id} />
        <div class="webhook-row">
          <input
            name="webhookUrl"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={data.team.discordWebhookUrl ?? ''}
          />
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
      {#if form?.webhookSaved}
        <p class="success">Webhook saved.</p>
      {/if}
      {#if form?.message}
        <p class="error">{form.message}</p>
      {/if}
    </section>
  {/if}

  <section class="card members-section">
    <h2 class="section-title">Members</h2>
    <ul class="members-list">
      {#each data.members as m (m.id)}
        <li>
          <span class="member-name">{m.displayName}</span>
          <span class="tag tag-{m.role === 'admin' ? 'momentum' : 'neutral'}">{m.role}</span>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .settings-view h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
  section + section { margin-top: 1.5rem; }
  .hint { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem; }

  .invite-code-display { display: flex; align-items: center; gap: 0.75rem; }
  .invite-code-display code {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    background: var(--accent-dim);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    color: var(--accent);
    border: 1px solid rgba(0, 240, 255, 0.15);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .webhook-row { display: flex; gap: 0.75rem; align-items: center; }
  .webhook-row input { flex: 1; }

  .members-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .members-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }
  .members-list li:last-child { border-bottom: none; }
  .member-name { font-weight: 500; }
</style>
