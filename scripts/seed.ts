import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sql = neon(DATABASE_URL);

function uuid() {
  return crypto.randomUUID();
}

function getMonday(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7);
  return d.toISOString().split('T')[0];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const tags = ['momentum', 'risk', 'blocked', 'neutral'];

const reflections = [
  'Feeling great about the sprint, we shipped the feature ahead of schedule.',
  'Some confusion around the requirements this week. Need more PM alignment.',
  'Quality is slipping — we skipped tests to hit the deadline.',
  'Team morale is high after the successful launch.',
  'Blocked on the API team, can\'t make progress on the integration.',
  'Good velocity but technical debt is accumulating fast.',
  'Customer feedback sessions this week were really eye-opening.',
  'Refactored the auth module — much cleaner now, less risk going forward.',
  'Too many meetings eating into deep work time.',
  'Design handoff was smooth. Best collaboration with design team in months.',
  'Onboarding the new engineer slowed us down but it\'s an investment.',
  'Incident response took half the week. Need to address root cause.',
  'Shipped the MVP, but worried about edge cases we haven\'t tested.',
  'Strong week. Clear goals, minimal distractions, solid output.',
  'Stakeholder priorities shifted mid-sprint again. Frustrating.',
  'Pair programming sessions are really paying off for code quality.',
  'Infrastructure migration went smoothly, no downtime.',
  'Sprint planning felt rushed — we over-committed.',
  'The new monitoring dashboard already caught two issues in prod.',
  'Cross-team dependency is the biggest bottleneck right now.',
];

// Team archetypes with different "personality" score ranges
const teamConfigs = [
  {
    name: 'Nebula Labs',
    inviteCode: 'NEB042',
    members: ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan'],
    // Declining team — started strong, dropping
    profile: (weeksAgo: number) => ({
      clarity:   Math.max(1, rand(3, 5) - (weeksAgo < 3 ? 2 : 0)),
      execution: Math.max(1, rand(2, 4) - (weeksAgo < 4 ? 1 : 0)),
      quality:   Math.max(1, rand(3, 5) - (weeksAgo < 2 ? 2 : 0)),
    }),
  },
  {
    name: 'Orbit Engine',
    inviteCode: 'ORB777',
    members: ['Sam', 'Taylor', 'Jamie'],
    // Volatile team — scores swing a lot
    profile: (_weeksAgo: number) => ({
      clarity:   rand(1, 5),
      execution: rand(1, 5),
      quality:   rand(2, 5),
    }),
  },
  {
    name: 'Patchwork Co',
    inviteCode: 'PAT999',
    members: ['Drew', 'Avery', 'Quinn', 'Blake', 'Charlie', 'Dakota'],
    // Consistently mediocre
    profile: (_weeksAgo: number) => ({
      clarity:   rand(2, 3),
      execution: rand(2, 4),
      quality:   rand(2, 3),
    }),
  },
];

async function seed() {
  console.log('Seeding database...\n');

  // Clean up all existing teams and data, then keep only our three demo teams.
  // This removes all existing teams (including old seeds or manual ones),
  // then we re-create Nebula Labs, Orbit Engine, and Patchwork Co from scratch.
  console.log('  Clearing existing teams, members, and check-ins...');
  await sql`DELETE FROM checkins`;
  await sql`DELETE FROM team_members`;
  await sql`DELETE FROM teams`;
  console.log('  Cleared.\n');

  // Create auth users for all members across all teams
  const userMap = new Map<string, string>(); // displayName -> userId
  let emailCounter = 1;

  for (const team of teamConfigs) {
    for (const member of team.members) {
      if (!userMap.has(member)) {
        const id = uuid();
        userMap.set(member, id);
        const email = `${member.toLowerCase()}${emailCounter++}@sentio-seed.dev`;

        await sql`
          INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
          VALUES (${id}, ${member}, ${email}, true, NOW(), NOW())
          ON CONFLICT (email) DO NOTHING
        `;
        console.log(`  User: ${member} (${email})`);
      }
    }
  }

  console.log(`\nCreated ${userMap.size} users.\n`);

  // Create teams, members, and 8 weeks of check-ins
  for (const config of teamConfigs) {
    const teamId = uuid();
    const creatorId = userMap.get(config.members[0])!;

    await sql`
      INSERT INTO teams (id, name, invite_code, created_by, created_at)
      VALUES (${teamId}, ${config.name}, ${config.inviteCode}, ${creatorId}, NOW())
      ON CONFLICT (invite_code) DO NOTHING
    `;
    console.log(`Team: ${config.name} (invite: ${config.inviteCode})`);

    // Add members
    for (let i = 0; i < config.members.length; i++) {
      const userId = userMap.get(config.members[i])!;
      const role = i === 0 ? 'admin' : 'member';

      await sql`
        INSERT INTO team_members (id, team_id, user_id, display_name, role, joined_at)
        VALUES (${uuid()}, ${teamId}, ${userId}, ${config.members[i]}, ${role}, NOW())
        ON CONFLICT (team_id, user_id) DO NOTHING
      `;
    }

    // Create 8 weeks of check-ins
    for (let w = 7; w >= 0; w--) {
      const weekOf = getMonday(w);
      // Not every member checks in every week (80% chance)
      for (const member of config.members) {
        if (Math.random() > 0.8) continue;

        const userId = userMap.get(member)!;
        const scores = config.profile(w);

        await sql`
          INSERT INTO checkins (id, user_id, team_id, clarity_score, execution_score, quality_score, reflection, tag, week_of, created_at)
          VALUES (
            ${uuid()}, ${userId}, ${teamId},
            ${scores.clarity}, ${scores.execution}, ${scores.quality},
            ${pick(reflections)}, ${pick(tags)}, ${weekOf}, NOW()
          )
          ON CONFLICT (user_id, team_id, week_of) DO NOTHING
        `;
      }
      console.log(`  Week ${weekOf}: check-ins created`);
    }
    console.log('');
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
