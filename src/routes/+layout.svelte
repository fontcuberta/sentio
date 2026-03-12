<script lang="ts">
  import '../app.css';
  import type { LayoutServerData } from './$types';

  let { children, data }: { children: any; data: LayoutServerData } = $props();
</script>

<svelte:head>
  <title>Sentio</title>
</svelte:head>

{#if data.user}
  <nav class="main-nav">
    <a href="/dashboard" class="nav-brand">Sentio</a>
    <div class="nav-links">
      <a href="/dashboard">Dashboard</a>
      <a href="/checkin">Check-in</a>
      <a href="/settings">Settings</a>
      <form method="post" action="/login?/signOut" class="inline-form">
        <button class="nav-signout">Sign out</button>
      </form>
    </div>
  </nav>
{/if}

<main class="main-content">
  {@render children()}
</main>

<style>
  .main-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-brand {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--accent);
    text-decoration: none;
    text-shadow: 0 0 10px var(--accent-glow);
    letter-spacing: 0.05em;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .nav-links a {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.25rem 0;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .nav-links a:hover {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .inline-form { display: inline; }

  .nav-signout {
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.3rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
    cursor: pointer;
    font-weight: 500;
    font-family: inherit;
  }

  .nav-signout:hover {
    color: var(--neon-red);
    border-color: var(--neon-red);
  }

  .main-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
</style>
