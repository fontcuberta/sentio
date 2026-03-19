import { json, error } from '@sveltejs/kit';
import { randomUUID, webcrypto, randomBytes } from 'crypto';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { db } from '$lib/server/db';
import { user as authUser, account as authAccount } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

function generatePassword(length = 16) {
  // Simple strong generator for dev/capstone usage.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function hashPassword(password: string): Promise<string> {
  // Must match Better Auth’s internal password hashing:
  // `${salt}:${hex(scryptAsync(password.normalize("NFKC"), salt, {N,r,p,dkLen,maxmem}))}`
  const N = 16384;
  const r = 16;
  const p = 1;
  const dkLen = 64;

  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N,
    r,
    p,
    dkLen,
    maxmem: 128 * N * r * 2
  });

  const saltHex = Buffer.from(salt).toString('hex');
  const keyHex = Buffer.from(key).toString('hex');
  return `${saltHex}:${keyHex}`;
}

export const POST = async ({ request, locals }) => {
  const viewer = locals.user;
  if (!viewer) return error(401, 'Unauthorized');

  const viewerEmail = viewer.email?.toLowerCase();
  if (viewerEmail !== SUPERADMIN_EMAIL) return error(403, 'Forbidden');

  const body = await request.json().catch(() => ({}));
  const userId = body?.userId?.toString?.() ?? '';
  const password = typeof body?.password === 'string' ? body.password : null;

  if (!userId) return error(400, 'Missing userId');

  const [targetUser] = await db
    .select({ id: authUser.id, emailVerified: authUser.emailVerified })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  if (!targetUser) return error(404, 'User not found');

  const nextPassword = password && password.trim().length ? password.trim() : generatePassword(16);
  if (nextPassword.length < 8) return error(400, 'Password must be at least 8 characters');

  const passwordHash = await hashPassword(nextPassword);

  await db
    .update(authUser)
    .set({ emailVerified: true })
    .where(eq(authUser.id, userId));

  // Replace existing credential account (Better Auth stores credential passwords in `account.password`).
  await db
    .delete(authAccount)
    .where(
      and(
        eq(authAccount.userId, userId),
        eq(authAccount.providerId, 'credential')
      )
    );

  await db.insert(authAccount).values({
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
  });

  const shouldReturnPassword = !(password && password.trim().length);
  return json({
    success: true,
    newPassword: shouldReturnPassword ? nextPassword : undefined,
  });
};

