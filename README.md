# Sentio

A web app that helps product and engineering teams track perceived product health through quick weekly check-ins. Combines team sentiment scores with written reflections into a shared visual "pulse."

## Tech Stack

- **Framework**: SvelteKit
- **Database**: Neon (PostgreSQL) via Drizzle ORM
- **Auth**: Better Auth (email + password)
- **Charts**: Observable Plot
- **Integration**: Discord webhooks

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Neon database at [neon.tech](https://neon.tech)

3. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

4. Push the database schema:

```bash
npm run db:push
```

5. Generate the auth schema tables:

```bash
npm run auth:schema
npm run db:push
```

6. Start the dev server:

```bash
npm run dev
```

## Project Structure

```
src/
  lib/
    server/
      auth.ts            Better Auth configuration
      db/
        index.ts         Drizzle + Neon client
        schema.ts        App tables (teams, team_members, checkins)
        auth.schema.ts   Better Auth tables (user, session, account)
    components/
      PulseChart.svelte      Observable Plot trend charts
      ReflectionFeed.svelte  Team reflections list
      WeeklySummary.svelte   Discord sharing preview
  routes/
    login/               Sign in / sign up
    onboarding/          Create or join a team
    dashboard/           Pulse overview + charts + reflections
    checkin/             Weekly check-in form
    settings/            Team settings + Discord webhook
    api/discord-pulse/   Server endpoint for Discord posting
```

## Data Model

- **teams**: groups users with invite codes and optional Discord webhook
- **team_members**: links users to teams with display names and roles
- **checkins**: weekly scores (clarity, execution, quality) + reflection + tag
