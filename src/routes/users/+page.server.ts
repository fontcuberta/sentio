import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as authUser, teams, teamMembers, organizations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) return redirect(302, '/login');

  const viewerEmail = event.locals.user.email?.toLowerCase();
  if (viewerEmail !== SUPERADMIN_EMAIL) return redirect(302, '/dashboard');

  const allUsers = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      emailVerified: authUser.emailVerified,
    })
    .from(authUser)
    .orderBy(authUser.email);

  const allMemberships = await db
    .select({
      userId: teamMembers.userId,
      teamId: teamMembers.teamId,
      role: teamMembers.role,
      organizationName: organizations.name,
      teamName: teams.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(organizations, eq(teams.organizationId, organizations.id));

  const membershipByUserId = new Map<string, { teamId: string; organizationName: string; teamName: string; role: string }[]>();
  for (const m of allMemberships) {
    const list = membershipByUserId.get(m.userId) ?? [];
    list.push({ teamId: m.teamId, organizationName: m.organizationName, teamName: m.teamName, role: m.role });
    membershipByUserId.set(m.userId, list);
  }

  const adminUsers = allUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
    isSuperadminUser: u.email.toLowerCase() === SUPERADMIN_EMAIL,
    memberships: membershipByUserId.get(u.id) ?? [],
  }));

  return { adminUsers };
};

