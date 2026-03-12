import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) return redirect(302, '/login');

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, event.locals.user.id))
    .limit(1);

  if (!membership) return redirect(302, '/onboarding');

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, membership.teamId))
    .limit(1);

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, membership.teamId));

  return {
    team,
    members,
    isAdmin: membership.role === 'admin'
  };
};

export const actions: Actions = {
  saveWebhook: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Not authenticated' });

    const formData = await event.request.formData();
    const teamId = formData.get('teamId')?.toString() ?? '';
    const webhookUrl = formData.get('webhookUrl')?.toString()?.trim() || null;

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, event.locals.user.id),
          eq(teamMembers.role, 'admin')
        )
      )
      .limit(1);

    if (!membership) return fail(403, { message: 'Only admins can update settings' });

    await db
      .update(teams)
      .set({ discordWebhookUrl: webhookUrl })
      .where(eq(teams.id, teamId));

    return { webhookSaved: true };
  }
};
