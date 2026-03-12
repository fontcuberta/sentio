import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers, checkins } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

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

  const currentWeek = getMonday(new Date());

  const weekCheckins = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.teamId, membership.teamId),
        eq(checkins.weekOf, currentWeek)
      )
    );

  const nameMap = Object.fromEntries(
    members.map(m => [m.userId, m.displayName])
  );

  const weekCheckinsWithNames = weekCheckins.map(c => ({
    ...c,
    displayName: nameMap[c.userId] ?? 'Anonymous'
  }));

  // Trend data: last 8 weeks
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
        eq(checkins.teamId, membership.teamId),
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

  return {
    team,
    members,
    weekCheckins: weekCheckinsWithNames,
    trendData,
    currentWeek,
    memberCount: members.length
  };
};
