import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teamMembers, checkins } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) return redirect(302, '/login');

  const memberships = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, event.locals.user.id));

  if (!memberships.length) return redirect(302, '/onboarding');

  const membershipTeamIds = memberships.map(m => m.teamId);
  const teamIdParam = event.url.searchParams.get('team');
  const teamId = teamIdParam && membershipTeamIds.includes(teamIdParam) ? teamIdParam : memberships[0].teamId;

  const weekOf = getMonday(new Date());

  const [existing] = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, event.locals.user.id),
        eq(checkins.teamId, teamId),
        eq(checkins.weekOf, weekOf)
      )
    )
    .limit(1);

  return {
    teamId,
    existing: existing ?? null
  };
};

export const actions: Actions = {
  submit: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Not authenticated' });

    const formData = await event.request.formData();
    const teamId = formData.get('teamId')?.toString() ?? '';
    const clarityScore = parseInt(formData.get('clarityScore')?.toString() ?? '3');
    const executionScore = parseInt(formData.get('executionScore')?.toString() ?? '3');
    const qualityScore = parseInt(formData.get('qualityScore')?.toString() ?? '3');
    const reflection = formData.get('reflection')?.toString()?.trim() ?? '';
    const tag = formData.get('tag')?.toString() || null;

    if (!teamId) return fail(400, { message: 'Missing team' });
    if (reflection.length < 10) return fail(400, { message: 'Reflection must be at least 10 characters' });
    if (reflection.length > 500) return fail(400, { message: 'Reflection must be under 500 characters' });

    for (const score of [clarityScore, executionScore, qualityScore]) {
      if (score < 1 || score > 5) return fail(400, { message: 'Scores must be between 1 and 5' });
    }

    const weekOf = getMonday(new Date());

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, event.locals.user.id),
          eq(teamMembers.teamId, teamId)
        )
      )
      .limit(1);

    if (!membership) return fail(403, { message: 'Forbidden' });

    const [existing] = await db
      .select({ id: checkins.id })
      .from(checkins)
      .where(
        and(
          eq(checkins.userId, event.locals.user.id),
          eq(checkins.teamId, teamId),
          eq(checkins.weekOf, weekOf)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(checkins)
        .set({ clarityScore, executionScore, qualityScore, reflection, tag })
        .where(eq(checkins.id, existing.id));
    } else {
      await db.insert(checkins).values({
        userId: event.locals.user.id,
        teamId,
        clarityScore,
        executionScore,
        qualityScore,
        reflection,
        tag,
        weekOf
      });
    }

    return redirect(302, '/dashboard');
  }
};
