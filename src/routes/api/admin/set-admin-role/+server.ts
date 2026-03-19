import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user as authUser, teamMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

export const POST = async ({ request, locals }) => {
  const viewer = locals.user;
  if (!viewer) return error(401, 'Unauthorized');
  const viewerEmail = viewer.email?.toLowerCase();
  if (viewerEmail !== SUPERADMIN_EMAIL) return error(403, 'Forbidden');

  const body = await request.json().catch(() => ({}));
  const userId = body?.userId?.toString?.() ?? '';
  const teamId = body?.teamId?.toString?.() ?? '';
  const role = body?.role?.toString?.() ?? '';

  if (!userId || !teamId) return error(400, 'Missing userId/teamId');
  if (role !== 'admin' && role !== 'member') return error(400, 'role must be admin or member');

  // Do not allow changing superadmin's org-admin role (prevents footguns).
  const [targetUser] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  if (!targetUser) return error(404, 'User not found');
  if (targetUser.email?.toLowerCase() === SUPERADMIN_EMAIL) {
    return error(403, 'Cannot change superadmin role');
  }

  await db
    .update(teamMembers)
    .set({ role })
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.teamId, teamId)
      )
    );

  return json({ success: true });
};

