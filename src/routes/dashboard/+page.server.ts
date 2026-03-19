import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers, checkins, organizations, user as authUser } from '$lib/server/db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) return redirect(302, '/login');

  const viewer = event.locals.user;
  const viewerEmail = viewer.email?.toLowerCase();
  const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';
  const isSuperadmin = viewerEmail === SUPERADMIN_EMAIL;

  const memberships = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, viewer.id));

  if (!memberships.length) return redirect(302, '/onboarding');

  const memberTeamIds = memberships.map(m => m.teamId);

  // Determine allowed teams:
  // - superadmin: all teams
  // - org-admin (role=admin on any team): all teams within those orgs
  // - member: teams they're a member of
  let allTeams: { id: string; name: string }[] = [];
  let isOrgAdmin = false;

  if (isSuperadmin) {
    allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);
  } else {
    const adminTeamIds = memberships.filter(m => m.role === 'admin').map(m => m.teamId);
    isOrgAdmin = adminTeamIds.length > 0;

    if (isOrgAdmin) {
      const adminOrgRows = await db
        .select({ organizationId: teams.organizationId })
        .from(teams)
        .where(inArray(teams.id, adminTeamIds));
      const orgIds = Array.from(new Set(adminOrgRows.map(r => r.organizationId)));

      allTeams = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.organizationId, orgIds));
    } else {
      allTeams = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.id, memberTeamIds));
    }
  }

  const allowedTeamIds = allTeams.map(t => t.id);

  const teamIdParam = event.url.searchParams.get('team');
  const activeTeamId = teamIdParam && allowedTeamIds.includes(teamIdParam)
    ? teamIdParam
    : allowedTeamIds[0] ?? memberTeamIds[0];

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, activeTeamId))
    .limit(1);

  if (!team) return redirect(302, '/dashboard');

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, activeTeamId));

  const currentWeek = getMonday(new Date());

  // Heatmap + aggregates always use all members in the team.
  const weekCheckinsAll = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.teamId, activeTeamId),
        eq(checkins.weekOf, currentWeek)
      )
    );

  const nameMap = Object.fromEntries(members.map(m => [m.userId, m.displayName]));

  const weekCheckinsWithNamesAll = weekCheckinsAll.map(c => ({
    ...c,
    displayName: nameMap[c.userId] ?? 'Anonymous'
  }));

  // Member resume isolation: non-admins only see their own reflections.
  const weekCheckinsForReflection = isSuperadmin || isOrgAdmin
    ? weekCheckinsWithNamesAll
    : weekCheckinsWithNamesAll.filter(c => c.userId === viewer.id);

  // Trend data: last 8 weeks (team-level averages)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const since = getMonday(eightWeeksAgo);

  const allCheckins = await db
    .select({
      clarityScore: checkins.clarityScore,
      executionScore: checkins.executionScore,
      qualityScore: checkins.qualityScore,
      weekOf: checkins.weekOf,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.teamId, activeTeamId),
        gte(checkins.weekOf, since)
      )
    );

  const grouped: Record<string, { clarity: number[]; execution: number[]; quality: number[] }> = {};
  for (const row of allCheckins) {
    const week = row.weekOf;
    if (!grouped[week]) grouped[week] = { clarity: [], execution: [], quality: [] };
    grouped[week].clarity.push(row.clarityScore);
    grouped[week].execution.push(row.executionScore);
    grouped[week].quality.push(row.qualityScore);
  }

  const trendData: { week: string; dimension: string; avg: number; min: number; max: number }[] = [];
  for (const [week, scores] of Object.entries(grouped)) {
    for (const dim of ['clarity', 'execution', 'quality'] as const) {
      const vals = scores[dim];
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      trendData.push({ week, dimension: dim, avg, min: Math.min(...vals), max: Math.max(...vals) });
    }
  }
  trendData.sort((a, b) => a.week.localeCompare(b.week));

  // Tag distribution: all check-ins across history (team-level)
  const allTagCheckins = await db
    .select({ tag: checkins.tag })
    .from(checkins)
    .where(eq(checkins.teamId, activeTeamId));

  // Week-over-week change (team-level averages)
  const prevWeekDate = new Date();
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeek = getMonday(prevWeekDate);

  const prevCheckins = await db
    .select({
      clarityScore: checkins.clarityScore,
      executionScore: checkins.executionScore,
      qualityScore: checkins.qualityScore,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.teamId, activeTeamId),
        eq(checkins.weekOf, prevWeek)
      )
    );

  function dimAvg(rows: { clarityScore: number; executionScore: number; qualityScore: number }[], field: 'clarityScore' | 'executionScore' | 'qualityScore') {
    if (!rows.length) return null;
    return rows.reduce((s, r) => s + r[field], 0) / rows.length;
  }

  const weekOverWeek = {
    clarity: { current: dimAvg(weekCheckinsAll, 'clarityScore'), previous: dimAvg(prevCheckins, 'clarityScore') },
    execution: { current: dimAvg(weekCheckinsAll, 'executionScore'), previous: dimAvg(prevCheckins, 'executionScore') },
    quality: { current: dimAvg(weekCheckinsAll, 'qualityScore'), previous: dimAvg(prevCheckins, 'qualityScore') },
  };

  // Discord “status signals” from #general (content only). Optional.
  let generalSignals: string[] = [];
  try {
    const origin = event.url.origin;
    const res = await fetch(`${origin}/api/discord-general?teamId=${activeTeamId}`, {
      headers: {
        cookie: event.request.headers.get('cookie') ?? ''
      }
    });
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body?.messages)) {
        generalSignals = body.messages
          .map((m: any) =>
            typeof m === 'string'
              ? m
              : (typeof m?.content === 'string' ? m.content : '')
          )
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }
    }
  } catch {
    generalSignals = [];
  }

  // Superadmin: list all users + their team memberships (for password resets).
  let adminUsers: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    memberships: { organizationName: string; teamName: string; role: string }[];
  }[] = [];

  if (isSuperadmin) {
    const allUsers = await db
      .select({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        emailVerified: authUser.emailVerified,
      })
      .from(authUser);

    const allMemberships = await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
        organizationName: organizations.name,
        teamName: teams.name,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(organizations, eq(teams.organizationId, organizations.id));

    const membershipByUserId = new Map<string, { organizationName: string; teamName: string; role: string }[]>();
    for (const m of allMemberships) {
      const list = membershipByUserId.get(m.userId) ?? [];
      list.push({ organizationName: m.organizationName, teamName: m.teamName, role: m.role });
      membershipByUserId.set(m.userId, list);
    }

    adminUsers = allUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified,
      memberships: membershipByUserId.get(u.id) ?? [],
    }));
  }

  return {
    team,
    members,
    weekCheckins: weekCheckinsWithNamesAll,
    reflectionCheckins: weekCheckinsForReflection,
    trendData,
    currentWeek,
    memberCount: members.length,
    allTagCheckins,
    weekOverWeek,
    allTeams,
    generalSignals,
    canPostToDiscord: isSuperadmin || isOrgAdmin,
    isSuperadmin,
    adminUsers,
  };
};
