import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers, checkins } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return error(401, 'Not authenticated');

  const body = await request.json();
  const { team_id, week_of } = body;

  if (!team_id || !week_of) return error(400, 'team_id and week_of are required');

  const [team] = await db
    .select({ name: teams.name, discordWebhookUrl: teams.discordWebhookUrl, organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, team_id))
    .limit(1);

  if (!team) return error(404, 'Team not found');
  if (!team.discordWebhookUrl) return error(400, 'No Discord webhook configured');
  if (!team.discordWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return error(400, 'Invalid webhook URL. Go to Settings and paste a proper Discord webhook URL (Edit Channel → Integrations → Webhooks).');
  }

  const viewerEmail = locals.user.email?.toLowerCase();
  const isSuperadmin = viewerEmail === SUPERADMIN_EMAIL;

  // Only superadmin or org-admins (role=admin within the team’s org) can post pulses.
  if (!isSuperadmin) {
    const [adminMembership] = await db
      .select({ teamId: teams.id })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.userId, locals.user.id),
          eq(teamMembers.role, 'admin'),
          eq(teams.organizationId, team.organizationId)
        )
      )
      .limit(1);

    if (!adminMembership) return error(403, 'Forbidden');
  }

  const weekCheckins = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.teamId, team_id), eq(checkins.weekOf, week_of)));

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team_id));

  const count = weekCheckins.length;
  const total = members.length;

  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—';

  const clarityAvg = avg(weekCheckins.map(c => c.clarityScore));
  const executionAvg = avg(weekCheckins.map(c => c.executionScore));
  const qualityAvg = avg(weekCheckins.map(c => c.qualityScore));

  const weekDate = new Date(week_of + 'T00:00:00');
  const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const tags: Record<string, number> = {};
  for (const c of weekCheckins) {
    if (c.tag) tags[c.tag] = (tags[c.tag] || 0) + 1;
  }
  const tagLine = Object.entries(tags).map(([t, n]) => `${n} ${t}`).join(', ');

  const topReflections = weekCheckins
    .filter(c => c.reflection)
    .slice(0, 3)
    .map(c => {
      const text = c.reflection.length > 120 ? c.reflection.slice(0, 120) + '...' : c.reflection;
      return `• "${text}"`;
    })
    .join('\n');

  let description = `**Clarity:** ${clarityAvg} / 5\n`;
  description += `**Execution:** ${executionAvg} / 5\n`;
  description += `**Quality:** ${qualityAvg} / 5\n`;
  description += `**Responses:** ${count} / ${total}\n`;
  if (topReflections) description += `\n**Top reflections:**\n${topReflections}\n`;
  if (tagLine) description += `\n**Tags:** ${tagLine}`;

  const discordPayload = {
    embeds: [{
      title: `Sentio — ${team.name}`,
      description,
      footer: { text: `Week of ${weekLabel}` },
      color: 0x00f0ff,
    }]
  };

  let discordRes: Response;
  try {
    discordRes = await fetch(team.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });
  } catch (fetchErr: any) {
    return error(502, `Discord fetch failed: ${String(fetchErr)}`);
  }

  const discordBody = await discordRes.text();

  if (discordBody.trimStart().startsWith('<!DOCTYPE') || discordBody.trimStart().startsWith('<html')) {
    return error(502, 'Discord returned an HTML page instead of accepting the webhook. Check that the webhook URL is correct.');
  }

  if (!discordRes.ok) {
    return error(502, `Discord error: ${discordBody}`);
  }

  return json({ success: true });
};
