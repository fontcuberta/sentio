<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<div class="onboarding-view">
  <h1>Get started</h1>
  <p class="subtitle">Create a new team or join an existing one.</p>

  <div class="onboarding-options">
    <div class="card option-card">
      <h2>Create a team</h2>
      <p>Start a new Sentio workspace for your team.</p>
      <form method="post" action="?/createTeam" use:enhance>
        <label for="team-name">Team name</label>
        <input id="team-name" name="name" type="text" placeholder="e.g. Product Squad" required />
        <label for="dn-create">Your display name</label>
        <input id="dn-create" name="displayName" type="text" placeholder="e.g. Alex" required />
        <button type="submit" class="btn btn-primary">Create team</button>
      </form>
    </div>

    <div class="card option-card">
      <h2>Join a team</h2>
      <p>Enter the invite code your team shared with you.</p>
      <form method="post" action="?/joinTeam" use:enhance>
        <label for="invite-code">Invite code</label>
        <input id="invite-code" name="inviteCode" type="text" placeholder="ABC123" maxlength="6" required />
        <label for="dn-join">Your display name</label>
        <input id="dn-join" name="displayName" type="text" placeholder="e.g. Alex" required />
        <button type="submit" class="btn btn-primary">Join team</button>
      </form>
    </div>
  </div>

  {#if form?.message}
    <p class="error" style="text-align:center; margin-top:1rem">{form.message}</p>
  {/if}
</div>

<style>
  .onboarding-view h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 2rem; }

  .onboarding-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 640px) {
    .onboarding-options { grid-template-columns: 1fr; }
  }

  .option-card h2 { font-size: 1.125rem; margin-bottom: 0.5rem; }
  .option-card p { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.25rem; }

  .option-card form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .option-card label { font-weight: 500; font-size: 0.8125rem; }
</style>
