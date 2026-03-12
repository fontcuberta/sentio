<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let isLogin = $state(true);
</script>

<div class="login-view">
  <div class="login-hero">
    <h1>Sentio</h1>
    <p>Understand what your product team really sees.</p>
  </div>

  <div class="auth-form">
    <h2>{isLogin ? 'Sign in' : 'Create account'}</h2>

    <form method="post" action={isLogin ? '?/signIn' : '?/signUp'} use:enhance>
      {#if !isLogin}
        <label for="name">Name</label>
        <input id="name" name="name" type="text" placeholder="Your name" required />
      {/if}

      <label for="email">Email</label>
      <input id="email" name="email" type="email" placeholder="you@company.com" required />

      <label for="password">Password</label>
      <input id="password" name="password" type="password" placeholder="••••••••" minlength="8" required />

      <button type="submit" class="btn btn-primary submit-btn">
        {isLogin ? 'Sign in' : 'Sign up'}
      </button>

      {#if form?.message}
        <p class="error">{form.message}</p>
      {/if}
    </form>

    <p class="toggle">
      {isLogin ? "Don't have an account?" : 'Already have an account?'}
      <button class="toggle-btn" onclick={() => isLogin = !isLogin}>
        {isLogin ? 'Sign up' : 'Sign in'}
      </button>
    </p>
  </div>
</div>

<style>
  .login-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
  }

  .login-hero {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .login-hero h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--accent);
    text-shadow: 0 0 20px var(--accent-glow), 0 0 40px rgba(0, 240, 255, 0.08);
    letter-spacing: 0.08em;
  }
  .login-hero p { color: var(--text-muted); max-width: 420px; line-height: 1.5; }

  .auth-form {
    max-width: 380px;
    width: 100%;
  }

  .auth-form h2 { margin-bottom: 1.5rem; text-align: center; }

  .auth-form form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .auth-form label { font-weight: 500; font-size: 0.875rem; }

  .submit-btn { width: 100%; margin-top: 0.5rem; }

  .toggle {
    text-align: center;
    margin-top: 1.25rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .toggle-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }
</style>
