import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teamMembers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) {
    return redirect(302, '/login');
  }

  const membership = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, event.locals.user.id))
    .limit(1);

  if (!membership.length) {
    return redirect(302, '/onboarding');
  }

  return redirect(302, '/checkin');
};
