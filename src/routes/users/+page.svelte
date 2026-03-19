<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();

  let passwordByUserId = $state<Record<string, string>>({});
  let newPasswordByUserId = $state<Record<string, string>>({});
  let busyUserId = $state<string | null>(null);
  let errorByUserId = $state<Record<string, string>>({});

  let busyRoleKey = $state<string | null>(null);
  let roleError = $state<string>('');

  async function setAdminRole(userId: string, teamId: string, nextRole: 'admin' | 'member') {
    roleError = '';
    const key = `${userId}:${teamId}:${nextRole}`;
    busyRoleKey = key;
    try {
      const res = await fetch('/api/admin/set-admin-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, teamId, role: nextRole })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Update failed (status ${res.status})`);

      // Reload to reflect updated memberships/permissions.
      window.location.reload();
    } catch (e: any) {
      roleError = e?.message ?? 'Update failed';
    } finally {
      busyRoleKey = null;
    }
  }

  async function copyText(textToCopy: string) {
    await navigator.clipboard.writeText(textToCopy);
  }

  async function resetUserPassword(userId: string) {
    errorByUserId = { ...errorByUserId, [userId]: '' };
    busyUserId = userId;

    try {
      const password = (passwordByUserId[userId] ?? '').trim() || null;
      const res = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Reset failed (status ${res.status})`);

      if (body?.newPassword) {
        newPasswordByUserId = { ...newPasswordByUserId, [userId]: body.newPassword };
      }
    } catch (e: any) {
      errorByUserId = { ...errorByUserId, [userId]: e?.message ?? 'Reset failed' };
    } finally {
      busyUserId = null;
    }
  }
 </script>

<div class="users-view">
  <h1>Users</h1>
  <p class="subtitle">Superadmin: reset passwords via Better Auth credential login.</p>
  {#if roleError}
    <p class="error-msg" style="margin-top: 0.5rem;">{roleError}</p>
  {/if}

  <div class="table-wrap">
    <table class="users-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Verified</th>
          <th>Teams</th>
          <th>Reset password</th>
        </tr>
      </thead>
      <tbody>
        {#each data.adminUsers as u (u.id)}
          <tr>
            <td class="td-name">
              <div class="name-cell">{u.name}</div>
            </td>
            <td class="td-email">
              <div class="email-cell">{u.email}</div>
            </td>
            <td>
              {#if u.emailVerified}
                <span class="tag tag-momentum">verified</span>
              {:else}
                <span class="tag tag-neutral">not verified</span>
              {/if}
            </td>
            <td>
              <div class="teams-cell">
                {#if u.memberships.length}
                  {#each u.memberships as m (m.organizationName + m.teamName)}
                    <div class="team-pill-row">
                      <span class="team-pill">
                        {m.organizationName} / {m.teamName} <span class="team-role">({m.role})</span>
                      </span>
                      {#if u.isSuperadminUser}
                        <button class="btn btn-secondary btn-sm" disabled>—</button>
                      {:else}
                        <button
                          class="btn btn-secondary btn-sm"
                          disabled={busyRoleKey !== null}
                          onclick={() => setAdminRole(u.id, m.teamId, m.role === 'admin' ? 'member' : 'admin')}
                        >
                          {m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </button>
                      {/if}
                    </div>
                  {/each}
                {:else}
                  <span class="muted">—</span>
                {/if}
              </div>
            </td>
            <td>
              <div class="reset-cell">
                <input
                  type="password"
                  placeholder="New password (blank = generate)"
                  value={passwordByUserId[u.id] ?? ''}
                  oninput={(e) => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    passwordByUserId = { ...passwordByUserId, [u.id]: v };
                  }}
                />
                <button
                  class="btn btn-primary"
                  disabled={busyUserId === u.id}
                  onclick={() => resetUserPassword(u.id)}
                >
                  {busyUserId === u.id ? 'Resetting...' : 'Reset'}
                </button>
              </div>

              {#if errorByUserId[u.id]}
                <div class="error-msg">{errorByUserId[u.id]}</div>
              {/if}

              {#if newPasswordByUserId[u.id]}
                <div class="new-password-box">
                  <div class="muted">Generated password:</div>
                  <div class="new-password-row">
                    <code>{newPasswordByUserId[u.id]}</code>
                    <button
                      class="btn btn-secondary"
                      type="button"
                      onclick={() => copyText(newPasswordByUserId[u.id])}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .users-view h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 1.25rem; max-width: 52rem; }

  .table-wrap {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-x: auto;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .users-table th {
    text-align: left;
    color: var(--text-muted);
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .users-table td {
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid rgba(42, 42, 58, 0.35);
    vertical-align: top;
  }

  .users-table tbody tr {
    transition: background var(--motion-duration) var(--motion-ease);
  }

  .users-table tbody tr:hover {
    background: rgba(0, 240, 255, 0.04);
  }

  .teams-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-width: 320px;
  }

  .team-pill {
    display: inline-flex;
    gap: 0.35rem;
    align-items: baseline;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text-muted);
    line-height: 1.2;
  }

  .team-role { color: var(--text-muted); font-size: 0.75rem; }

  .team-pill-row {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .reset-cell {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    max-width: 360px;
  }

  .reset-cell input {
    flex: 1;
    min-width: 220px;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
  }

  .new-password-box { margin-top: 0.5rem; }
  .new-password-row { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
  .new-password-row code {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
    color: var(--text);
    word-break: break-word;
  }

  .error-msg { margin-top: 0.5rem; color: var(--neon-red); font-size: 0.8rem; }

  .muted { color: var(--text-muted); }
</style>

