import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

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
export const GET: RequestHandler = async () => {
  const token = env.DISCORD_BOT_TOKEN;
  const channelId = env.DISCORD_GENERAL_CHANNEL_ID;

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

