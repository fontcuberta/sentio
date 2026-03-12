import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { teams, teamMembers, checkins } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return error(401, 'Not authenticated');

  const body = await request.json();
  const { team_id, week_of } = body;

  if (!team_id || !week_of) return error(400, 'team_id and week_of are required');

  const [team] = await db
    .select({ name: teams.name, discordWebhookUrl: teams.discordWebhookUrl })
    .from(teams)
    .where(eq(teams.id, team_id))
    .limit(1);

  if (!team) return error(404, 'Team not found');
  if (!team.discordWebhookUrl) return error(400, 'No Discord webhook configured');

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

  const discordRes = await fetch(team.discordWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordPayload),
  });

  if (!discordRes.ok) {
    const text = await discordRes.text();
    return error(502, `Discord error: ${text}`);
  }

  return json({ success: true });
};
