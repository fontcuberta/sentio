import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) return redirect(302, '/login');

  const membership = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, event.locals.user.id))
    .limit(1);

  if (membership.length) return redirect(302, '/dashboard');

  return {};
};

export const actions: Actions = {
  createTeam: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Not authenticated' });

    const formData = await event.request.formData();
    const name = formData.get('name')?.toString()?.trim() ?? '';
    const displayName = formData.get('displayName')?.toString()?.trim() ?? '';

    if (!name) return fail(400, { message: 'Team name is required' });
    if (!displayName) return fail(400, { message: 'Display name is required' });

    const inviteCode = generateInviteCode();

    const [team] = await db
      .insert(teams)
      .values({ name, inviteCode, createdBy: event.locals.user.id })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: event.locals.user.id,
      displayName,
      role: 'admin'
    });

    return redirect(302, '/dashboard');
  },

  joinTeam: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Not authenticated' });

    const formData = await event.request.formData();
    const code = formData.get('inviteCode')?.toString()?.trim()?.toUpperCase() ?? '';
    const displayName = formData.get('displayName')?.toString()?.trim() ?? '';

    if (!code) return fail(400, { message: 'Invite code is required' });
    if (!displayName) return fail(400, { message: 'Display name is required' });

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.inviteCode, code))
      .limit(1);

    if (!team) return fail(400, { message: 'Invalid invite code' });

    try {
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: event.locals.user.id,
        displayName,
        role: 'member'
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        return fail(400, { message: 'You are already a member of this team' });
      }
      throw err;
    }

    return redirect(302, '/dashboard');
  }
};
