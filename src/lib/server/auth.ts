import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
  baseURL: process.env.ORIGIN || 'http://localhost:5173',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me',
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [sveltekitCookies(getRequestEvent)]
});
