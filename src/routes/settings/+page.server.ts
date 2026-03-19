import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) return redirect(302, '/login');

  const viewer = event.locals.user;

  const memberships = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, viewer.id));

  if (!memberships.length) return redirect(302, '/onboarding');

  const membershipTeamIds = memberships.map(m => m.teamId);
  const teamIdParam = event.url.searchParams.get('team');
  const activeTeamId = teamIdParam && membershipTeamIds.includes(teamIdParam) ? teamIdParam : membershipTeamIds[0];

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, activeTeamId))
    .limit(1);

  if (!team) return redirect(302, '/dashboard');

  const isSuperadmin = viewer.email?.toLowerCase() === SUPERADMIN_EMAIL;
  const adminTeamIds = memberships.filter(m => m.role === 'admin').map(m => m.teamId);

  let isAdmin = isSuperadmin;
  if (!isAdmin && adminTeamIds.length) {
    const adminOrgRows = await db
      .select({ organizationId: teams.organizationId })
      .from(teams)
      .where(inArray(teams.id, adminTeamIds));
    const adminOrgIds = new Set(adminOrgRows.map(r => r.organizationId));
    isAdmin = adminOrgIds.has(team.organizationId);
  }

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, activeTeamId));

  return {
    team,
    members,
    isAdmin
  };
};

export const actions: Actions = {
  saveWebhook: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Not authenticated' });

    const formData = await event.request.formData();
    const teamId = formData.get('teamId')?.toString() ?? '';
    const webhookUrl = formData.get('webhookUrl')?.toString()?.trim() || null;

    const viewer = event.locals.user;
    const isSuperadmin = viewer.email?.toLowerCase() === SUPERADMIN_EMAIL;

    const [targetTeam] = await db
      .select({ organizationId: teams.organizationId })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!targetTeam) return fail(400, { message: 'Invalid team' });

    let canEdit = isSuperadmin;
    if (!canEdit) {
      const adminMemberships = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, viewer.id),
            eq(teamMembers.role, 'admin')
          )
        );

      const adminTeamIds = adminMemberships.map(m => m.teamId);
      if (adminTeamIds.length) {
        const adminOrgRows = await db
          .select({ organizationId: teams.organizationId })
          .from(teams)
          .where(inArray(teams.id, adminTeamIds));
        const adminOrgIds = new Set(adminOrgRows.map(r => r.organizationId));
        canEdit = adminOrgIds.has(targetTeam.organizationId);
      }
    }

    if (!canEdit) return fail(403, { message: 'Only org-admins can update settings' });

    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return fail(400, { message: 'Invalid webhook URL. It must start with https://discord.com/api/webhooks/  — go to your Discord channel → Edit Channel → Integrations → Webhooks to get it.' });
    }

    await db
      .update(teams)
      .set({ discordWebhookUrl: webhookUrl })
      .where(eq(teams.id, teamId));

    return { webhookSaved: true };
  }
};
