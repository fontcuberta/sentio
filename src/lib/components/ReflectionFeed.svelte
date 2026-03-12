<script lang="ts">
  let { checkins = [] }: { checkins: any[] } = $props();
</script>

<div class="reflection-feed">
  {#if !checkins.length}
    <div class="empty-feed">
      <p>No reflections this week yet.</p>
    </div>
  {:else}
    <ul class="feed-list">
      {#each checkins as c (c.id)}
        <li class="feed-item card">
          <div class="feed-header">
            <span class="feed-author">{c.displayName}</span>
            {#if c.tag}
              <span class="tag tag-{c.tag}">{c.tag}</span>
            {/if}
          </div>
          <p class="feed-reflection">{c.reflection}</p>
          <div class="feed-scores">
            <span>Clarity {c.clarityScore}</span>
            <span>Execution {c.executionScore}</span>
            <span>Quality {c.qualityScore}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .empty-feed { text-align: center; padding: 2rem; color: var(--text-muted); }

  .feed-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .feed-item { padding: 1rem 1.25rem; }

  .feed-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .feed-author { font-weight: 600; font-size: 0.875rem; }
  .feed-reflection { font-size: 0.9375rem; line-height: 1.5; margin-bottom: 0.75rem; }

  .feed-scores {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }
</style>
