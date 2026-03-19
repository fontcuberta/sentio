import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { randomUUID, webcrypto } from 'crypto';
import { scryptAsync } from '@noble/hashes/scrypt.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const DISCORD_GENERAL_CHANNEL_ID = process.env.DISCORD_GENERAL_CHANNEL_ID ?? '';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? null;

const sql = neon(DATABASE_URL);

const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';

// Password for the 3 org-admin seed users (and other demo members).
const SEED_PASSWORD = 'SentioSeed!2026';

function getMonday(weeksAgo) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7);
  return d.toISOString().split('T')[0];
}

function clampScore(n) {
  return Math.max(1, Math.min(5, Math.round(n)));
}

function reflectionFor({ reflections, orgIdx, teamIdx, memberIdx, weeksAgo }) {
  const idx = (orgIdx * 97 + teamIdx * 41 + memberIdx * 13 + weeksAgo * 7) % reflections.length;
  return reflections[idx];
}

function tagsForScores(avg) {
  if (avg >= 4) return 'momentum';
  if (avg >= 3) return 'neutral';
  if (avg >= 2) return 'risk';
  return 'blocked';
}

async function hashPassword(password) {
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

async function upsertUserAndResetCredentialAccount({ name, email }) {
  // Create / update user row, then ensure a valid Better Auth credential account exists.
  const userId = randomUUID();

  const [user] = await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, ${name}, ${email}, true, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name,
          email_verified = true,
          updated_at = NOW()
    RETURNING id, name, email
  `;

  await sql`
    DELETE FROM "account"
    WHERE provider_id = 'credential' AND user_id = ${user.id}
  `;

  const passwordHash = await hashPassword(SEED_PASSWORD);

  await sql`
    INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (${randomUUID()}, ${user.id}, 'credential', ${user.id}, ${passwordHash}, NOW(), NOW())
  `;

  return user.id;
}

async function ensureSuperadminUserIfMissing() {
  const [row] = await sql`
    SELECT id, name, email
    FROM "user"
    WHERE email = ${SUPERADMIN_EMAIL}
    LIMIT 1
  `;
  return row?.id ?? null;
}

const reflections = [
  'Feeling great about the sprint, we shipped the feature ahead of schedule.',
  'Some confusion around the requirements this week. Need more PM alignment.',
  "Quality is slipping — we skipped tests to hit the deadline.",
  'Team morale is high after the successful launch.',
  "Blocked on the API team, can't make progress on the integration.",
  'Good velocity but technical debt is accumulating fast.',
  'Customer feedback sessions this week were really eye-opening.',
  'Refactored the auth module — much cleaner now, less risk going forward.',
  'Too many meetings eating into deep work time.',
  'Design handoff was smooth. Best collaboration with design team in months.',
  "Onboarding the new engineer slowed us down but it's an investment.",
  'Incident response took half the week. Need to address root cause.',
  'Shipped the MVP, but worried about edge cases we haven’t tested.',
  'Strong week. Clear goals, minimal distractions, solid output.',
  'Stakeholder priorities shifted mid-sprint again. Frustrating.',
  'Pair programming sessions are really paying off for code quality.',
  'Infrastructure migration went smoothly, no downtime.',
  'Sprint planning felt rushed — we over-committed.',
  'The new monitoring dashboard already caught two issues in prod.',
  'Cross-team dependency is the biggest bottleneck right now.'
];

function scoresForArchetype({ archetype, weeksAgo, orgIdx, teamIdx, memberIdx }) {
  // weeksAgo: 0 = current week, 7 = oldest seeded week.
  const x = weeksAgo;
  const wave1 = Math.sin((x + 1) * (memberIdx + 1) * 1.13 + orgIdx * 0.7 + teamIdx);
  const wave2 = Math.cos((x + 2) * (memberIdx + 2) * 0.77 + orgIdx * 0.4 - teamIdx);

  let clarityBase = 3.2;
  let executionBase = 3.1;
  let qualityBase = 3.0;

  if (archetype === 'declining') {
    clarityBase = 4.3 - x * 0.32;
    executionBase = 4.0 - x * 0.28;
    qualityBase = 4.2 - x * 0.30;
  } else if (archetype === 'volatile') {
    clarityBase = 3.4 + wave1 * 0.9;
    executionBase = 3.2 + wave2 * 1.0;
    qualityBase = 3.1 + wave1 * 0.7;
  } else {
    // mediocre: clustered around ~2-3 with subtle movement
    clarityBase = 3.0 + wave1 * 0.25;
    executionBase = 2.7 + wave2 * 0.35;
    qualityBase = 2.8 + wave1 * 0.22;
  }

  const bias = (memberIdx - 1.2) * 0.08;

  const clarity = clampScore(clarityBase + bias);
  const execution = clampScore(executionBase + bias * 0.9);
  const quality = clampScore(qualityBase + bias * 1.1);

  return { clarity, execution, quality };
}

async function seed() {
  console.log('Seeding orgs/teams + check-ins...\n');

  if (!DISCORD_GENERAL_CHANNEL_ID) {
    console.warn('DISCORD_GENERAL_CHANNEL_ID is missing in .env; Discord signals card may be empty.');
  }

  console.log('  Clearing existing org/team/check-in data...');
  await sql`
    TRUNCATE TABLE checkins, team_members, teams, organizations
    RESTART IDENTITY CASCADE
  `;
  console.log('  Cleared.\n');

  const orgs = [
    {
      name: 'Nebula Labs',
      teams: [
        { name: 'Team 1', inviteCode: 'NEB042', archetype: 'declining' },
        { name: 'Team 2', inviteCode: 'NEB043', archetype: 'volatile' },
        { name: 'Team 3', inviteCode: 'NEB044', archetype: 'mediocre' }
      ]
    },
    {
      name: 'Orbit Engine',
      teams: [
        { name: 'Team 1', inviteCode: 'ORB777', archetype: 'volatile' },
        { name: 'Team 2', inviteCode: 'ORB778', archetype: 'mediocre' },
        { name: 'Team 3', inviteCode: 'ORB779', archetype: 'declining' }
      ]
    },
    {
      name: 'Patchwork Co',
      teams: [
        { name: 'Team 1', inviteCode: 'PAT999', archetype: 'mediocre' },
        { name: 'Team 2', inviteCode: 'PAT998', archetype: 'declining' },
        { name: 'Team 3', inviteCode: 'PAT997', archetype: 'volatile' }
      ]
    }
  ];

  const adminUsers = [
    { orgName: 'Nebula Labs', name: 'Nebula Org Admin', email: 'nebula.admin@sentio-seed.dev' },
    { orgName: 'Orbit Engine', name: 'Orbit Org Admin', email: 'orbit.admin@sentio-seed.dev' },
    { orgName: 'Patchwork Co', name: 'Patchwork Org Admin', email: 'patchwork.admin@sentio-seed.dev' }
  ];

  // Two member accounts per team (team1/team2/team3) => 6 members per org
  const memberAccountsByOrg = {};
  for (const org of orgs) {
    memberAccountsByOrg[org.name] = [];
    for (const [teamIdx] of org.teams.entries()) {
      const base = `${org.name}-Team-${teamIdx + 1}`.toLowerCase().replace(/\s+/g, '-');
      memberAccountsByOrg[org.name].push(
        { name: `${org.name.split(' ')[0]} M${teamIdx + 1}A`, email: `${base}.m1@sentio-seed.dev` },
        { name: `${org.name.split(' ')[0]} M${teamIdx + 1}B`, email: `${base}.m2@sentio-seed.dev` }
      );
    }
  }

  const superadminUserId = await ensureSuperadminUserIfMissing();
  if (!superadminUserId) {
    console.warn(`Superadmin user not found in DB: ${SUPERADMIN_EMAIL}. Team membership for them will be skipped.`);
  }

  const userIdByEmail = new Map();
  const allSeedUsers = [
    ...adminUsers.map(a => ({ name: a.name, email: a.email })),
    ...orgs.flatMap(o => memberAccountsByOrg[o.name])
  ];

  console.log(`  Creating/changing ${allSeedUsers.length} demo users (Better Auth credential accounts)...`);
  for (const u of allSeedUsers) {
    const userId = await upsertUserAndResetCredentialAccount(u);
    userIdByEmail.set(u.email, userId);
  }
  console.log('  Users ready.\n');

  console.log('  Creating organizations, teams, memberships, and check-ins...');

  for (const [orgIdx, org] of orgs.entries()) {
    const organizationId = randomUUID();
    const orgAdmin = adminUsers.find(a => a.orgName === org.name);
    const orgAdminUserId = userIdByEmail.get(orgAdmin.email);

    await sql`
      INSERT INTO organizations (id, name, created_by, created_at)
      VALUES (${organizationId}, ${org.name}, ${orgAdminUserId}, NOW())
    `;

    for (const [teamIdx, team] of org.teams.entries()) {
      const teamId = randomUUID();

      await sql`
        INSERT INTO teams (
          id,
          organization_id,
          name,
          invite_code,
          discord_webhook_url,
          discord_general_channel_id,
          created_by,
          created_at
        )
        VALUES (
          ${teamId},
          ${organizationId},
          ${`${org.name} - ${team.name}`},
          ${team.inviteCode},
          ${DISCORD_WEBHOOK_URL},
          ${DISCORD_GENERAL_CHANNEL_ID || null},
          ${orgAdminUserId},
          NOW()
        )
      `;

      const memberPairs = memberAccountsByOrg[org.name];
      const memberPairStart = teamIdx * 2;

      const teamMembersList = [];
      if (teamIdx === 0) {
        teamMembersList.push({ email: orgAdmin.email, displayName: orgAdmin.name, role: 'admin' });
      }
      const m1 = memberPairs[memberPairStart];
      const m2 = memberPairs[memberPairStart + 1];
      teamMembersList.push({ email: m1.email, displayName: m1.name, role: 'member' });
      teamMembersList.push({ email: m2.email, displayName: m2.name, role: 'member' });

      for (const [memberIdx, m] of teamMembersList.entries()) {
        const userId = userIdByEmail.get(m.email);

        await sql`
          INSERT INTO team_members (id, team_id, user_id, display_name, role, joined_at)
          VALUES (${randomUUID()}, ${teamId}, ${userId}, ${m.displayName}, ${m.role}, NOW())
          ON CONFLICT (team_id, user_id) DO NOTHING
        `;

        for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
          const scores = scoresForArchetype({ archetype: team.archetype, weeksAgo, orgIdx, teamIdx, memberIdx });
          const avg = (scores.clarity + scores.execution + scores.quality) / 3;
          const tag = tagsForScores(avg);
          const reflection = reflectionFor({ reflections, orgIdx, teamIdx, memberIdx, weeksAgo });

          await sql`
            INSERT INTO checkins (
              id,
              user_id,
              team_id,
              clarity_score,
              execution_score,
              quality_score,
              reflection,
              tag,
              week_of,
              created_at
            )
            VALUES (
              ${randomUUID()},
              ${userId},
              ${teamId},
              ${scores.clarity},
              ${scores.execution},
              ${scores.quality},
              ${reflection},
              ${tag},
              ${getMonday(weeksAgo)},
              NOW()
            )
            ON CONFLICT (user_id, team_id, week_of) DO NOTHING
          `;
        }
      }

      if (org.name === 'Nebula Labs' && teamIdx === 0 && superadminUserId) {
        await sql`
          INSERT INTO team_members (id, team_id, user_id, display_name, role, joined_at)
          VALUES (
            ${randomUUID()},
            ${teamId},
            ${superadminUserId},
            'Superadmin',
            'admin',
            NOW()
          )
          ON CONFLICT (team_id, user_id) DO NOTHING
        `;

        for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
          const scores = scoresForArchetype({ archetype: team.archetype, weeksAgo, orgIdx, teamIdx, memberIdx: 99 });
          const avg = (scores.clarity + scores.execution + scores.quality) / 3;
          const tag = tagsForScores(avg);
          const reflection = reflectionFor({ reflections, orgIdx, teamIdx, memberIdx: 99, weeksAgo });

          await sql`
            INSERT INTO checkins (
              id,
              user_id,
              team_id,
              clarity_score,
              execution_score,
              quality_score,
              reflection,
              tag,
              week_of,
              created_at
            )
            VALUES (
              ${randomUUID()},
              ${superadminUserId},
              ${teamId},
              ${scores.clarity},
              ${scores.execution},
              ${scores.quality},
              ${reflection},
              ${tag},
              ${getMonday(weeksAgo)},
              NOW()
            )
            ON CONFLICT (user_id, team_id, week_of) DO NOTHING
          `;
        }
      }
    }
  }

  console.log('\nSeeding complete.\n');
  console.log('Admin login credentials (org-admins):');
  for (const a of adminUsers) {
    console.log(`- ${a.name}`);
    console.log(`  Email: ${a.email}`);
    console.log(`  Password: ${SEED_PASSWORD}`);
  }
  console.log('\n(Discord write webhooks are left null in seed; set them in Settings per team.)');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

