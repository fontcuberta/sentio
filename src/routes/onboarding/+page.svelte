<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<div class="onboarding-view">
  <h1>Welcome to Sentio</h1>
  <p class="subtitle">
    Join your existing team to see its product pulse — or create a new workspace if you’re starting from scratch.
  </p>

  <div class="onboarding-layout">
    <div class="card join-card">
      <h2>Join your team</h2>
      <p class="hint">
        This is the most common path. Paste the 6‑character invite code your teammate shared with you.
      </p>
      <form method="post" action="?/joinTeam" use:enhance>
        <label for="invite-code">Invite code</label>
        <input id="invite-code" name="inviteCode" type="text" placeholder="e.g. NEB042" maxlength="6" required />

        <label for="dn-join">Your display name</label>
        <input id="dn-join" name="displayName" type="text" placeholder="How your team knows you" required />

        <button type="submit" class="btn btn-primary join-btn">Join team</button>
      </form>
    </div>

    <div class="card create-card">
      <h3 class="side-label">Or create a new workspace</h3>
      <p class="hint">
        Start fresh if you’re the first person from your team using Sentio.
      </p>
      <form method="post" action="?/createTeam" use:enhance>
        <label for="team-name">Team name</label>
        <input id="team-name" name="name" type="text" placeholder="e.g. Nebula Labs" required />

        <label for="dn-create">Your display name</label>
        <input id="dn-create" name="displayName" type="text" placeholder="e.g. Nevan" required />

        <button type="submit" class="btn btn-secondary create-btn">Create team</button>
      </form>
    </div>
  </div>

  {#if form?.message}
    <p class="error" style="text-align:center; margin-top:1rem">{form.message}</p>
  {/if}
</div>

<style>
  .onboarding-view h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 2rem; max-width: 34rem; }

  .onboarding-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: flex-start;
  }

  @media (max-width: 768px) {
    .onboarding-layout {
      grid-template-columns: 1fr;
    }
  }

  .join-card h2 { font-size: 1.2rem; margin-bottom: 0.35rem; }
  .join-card .hint,
  .create-card .hint {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1.25rem;
  }

  .join-card form,
  .create-card form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .join-card label,
  .create-card label {
    font-weight: 500;
    font-size: 0.8125rem;
  }

  .join-btn {
    margin-top: 0.75rem;
    width: 100%;
  }

  .create-btn {
    margin-top: 0.75rem;
    width: 100%;
  }

  .create-card {
    opacity: 0.9;
    border-style: dashed;
  }

  .side-label {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
</style>
