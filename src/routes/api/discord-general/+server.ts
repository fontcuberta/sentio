import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { teams, teamMembers } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

function normalize(s: string) {
  return s.toLowerCase();
}

function looksLikeStatusMessage(content: string) {
  const c = normalize(content);

  // Skip commands, empty, and obvious noise
  if (!c.trim()) return false;
  if (c.startsWith('http://') || c.startsWith('https://')) return false;
  if (c.startsWith('!') || c.startsWith('/')) return false;

  // Accept messages that look like status signals
  const keywords = [
    'status', 'blocked', 'blocking', 'risk', 'at risk', 'unblocked',
    'on track', 'off track', 'delayed', 'delay',
    'shipping', 'shipped', 'deploy', 'deployed', 'release',
    'incident', 'outage', 'downtime', 'sev', 'severe',
    'bug', 'broken', 'flaky', 'rollback',
    'prio', 'priority', 'scope', 'cut scope',
    'meeting', 'alignment', 'unclear', 'confusing',
  ];

  const hasKeyword = keywords.some((k) => c.includes(k));
  const hasPrefix = c.startsWith('status:') || c.startsWith('update:') || c.startsWith('today:') || c.startsWith('blocker:');

  return hasPrefix || hasKeyword;
}

// Returns a small list of “status signal” phrases from #general (content only).
export const GET: RequestHandler = async (event) => {
  const viewer = event.locals.user;
  if (!viewer) throw error(401, 'Unauthorized');

  const teamId = event.url.searchParams.get('teamId');
  if (!teamId) throw error(400, 'Missing teamId');

  const [targetTeam] = await db
    .select({ discordGeneralChannelId: teams.discordGeneralChannelId, organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!targetTeam) throw error(404, 'Team not found');

  const isSuperadmin = viewer.email?.toLowerCase() === SUPERADMIN_EMAIL;

  // Permission checks:
  // - superadmin: can read any team
  // - org-admin (role=admin on any team): can read any team in that org
  // - member: can read only teams they're in
  if (!isSuperadmin) {
    const memberships = await db
      .select({ teamId: teamMembers.teamId, role: teamMembers.role })
      .from(teamMembers)
      .where(eq(teamMembers.userId, viewer.id));

    const memberTeamIds = memberships.map(m => m.teamId);
    const isMemberOfTeam = memberTeamIds.includes(teamId);

    const adminTeamIds = memberships.filter(m => m.role === 'admin').map(m => m.teamId);
    if (!isMemberOfTeam) {
      if (!adminTeamIds.length) throw error(403, 'Forbidden');

      const adminOrgRows = await db
        .select({ organizationId: teams.organizationId })
        .from(teams)
        .where(inArray(teams.id, adminTeamIds));

      const adminOrgIds = new Set(adminOrgRows.map(r => r.organizationId));
      if (!adminOrgIds.has(targetTeam.organizationId)) throw error(403, 'Forbidden');
    }
  }

  const token = env.DISCORD_BOT_TOKEN;
  const channelId = targetTeam.discordGeneralChannelId;

  if (!token || !channelId) {
    return json({
      messages: [],
      debug: {
        hasToken: !!token,
        hasChannelId: !!channelId
      }
    });
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
      }
    });
  } catch (err: any) {
    return json({
      messages: [],
      debug: {
        hasToken: true,
        hasChannelId: true,
        fetchOk: false,
        fetchError: String(err)
      }
    }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text();
    return json({
      messages: [],
      debug: {
        hasToken: true,
        hasChannelId: true,
        fetchOk: false,
        status: res.status,
        body: body.slice(0, 200)
      }
    }, { status: 502 });
  }

  const raw = await res.json() as any[];

  const messages = raw
    .map((m) => {
      const content = String(m?.content ?? '').trim();
      return {
        content,
        matched: looksLikeStatusMessage(content),
      };
    })
    .slice(0, 12);

  return json({
    messages,
    debug: {
      count: raw.length,
    }
  });
};

