### Sentio — Surfacing the True Product Pulse of a Team

A SvelteKit app that turns weekly check-ins and Discord chatter into an honest view of product health.

---

## 1. Overview

Sentio is a lightweight product health tool for B2B SaaS teams.

It combines structured weekly check-ins, reflections, and live signals from a team’s Discord `#general` channel into a single dashboard that shows how the work is *actually* going — not just what the roadmap says.

It’s designed for product, engineering, and design leads who need to sense risk, morale, and execution quality early, before it shows up in lagging metrics.

---

## 2. Context

This project started as a capstone for a product-focused coding course, but I treated it as a real portfolio piece:

- **Context**
    - 2‑week window
    - Individual build, AI-assisted
    - Must be shippable (live on Netlify), not just a prototype
- **Constraints**
    - Use the course’s stack: **SvelteKit + Drizzle ORM + Neon Postgres + Better Auth**
    - No Supabase (free tier restrictions forced me off it mid-project)
    - Graphs via **Observable Plot**
    - Integration via **Discord**, not Slack, to keep scope realistic
- **Starting point**
    - A fairly clear product idea (weekly product “pulse”)
    - No existing SvelteKit project; I had to scaffold everything from scratch
    - I knew I’d have to make hard scope calls under time pressure

---

## 3. Problem Definition

Most product teams have:

- Jira boards that say “on track”
- Velocity charts and burn-downs
- Occasional retros

…but leads still feel blindsided by:

- Work silently blocked for a week
- Execution quality slipping under deadline pressure
- Morale dipping even when metrics look fine

**Problem:** There’s no simple, persistent way to capture and visualize how the *team* thinks the product is doing — across clarity, execution, quality, and risk — and to connect that with the “ambient” signals in team chatter.

**Initial assumptions**

- Weekly team check-ins should be **frictionless** (60 seconds, max).
- Scores only are not enough — **short reflections** matter.
- Teams already talk about status in tools like **Discord**; we should **pull signals from there**, not invent a new channel.
- For a two-week capstone, the goal isn’t a massive system — it’s a coherent, end-to-end slice that demonstrates good product and engineering decisions.

---

## 4. Approach

I combined product and engineering thinking around a simple principle:

> *“A small, reliable ritual beats a big, aspirational process.”*
> 

So the architecture and UX both optimized for:

- **Rituals over features**
    - Make the **weekly check-in** the first thing you see after login.
    - Make it emotionally pleasant: dark neon theme, clear copy, and satisfying sliders.
- **Server-side truth**
    - Use SvelteKit server routes and Drizzle to keep all business logic and access control on the server.
    - Keep the client thin — forms and charts only.
- **Context, not surveillance**
    - Only read Discord messages that *look like explicit status posts*.
    - **Strip all usernames** and IDs; store only text snippets that match well-defined patterns.

---

## 5. Process & Iterations

### Phase 1 — Initial Build (and Stack Whiplash)

**What I built first**

- A fully working version in **Vue 3 + Supabase**:
    - Auth, teams, check-ins, and a basic dashboard.
    - Observable Plot charts running on the client.
    - A Discord webhook integration for weekly recaps.

**What broke**

- Supabase free project limits blocked me from using it for the capstone.
- I decided to pivot to the course stack: **SvelteKit + Drizzle + Neon + Better Auth**.
- That meant **throwing away the entire Vue codebase** and re-implementing the app as a SvelteKit project.

**Key early decisions**

- Keep the **data model**: `teams`, `team_members`, `checkins`.
- Move all querying and logic into **SvelteKit server routes**:
    - `+page.server.ts` for check-ins, onboarding, and dashboard.
    - `+server.ts` routes for Discord integrations.
- Invest in a clean **DB layer** with Drizzle and Neon, even if it cost time upfront.

### Phase 2 — Iteration Loops (Auth, Data, and Theming)

**Auth and environment issues**

- Better Auth and Drizzle both originally accessed env vars via `process.env` at import time, which caused crashes during SvelteKit build.
- Fix:
    - Switched to SvelteKit’s `$env/dynamic/private` for **auth** and **db**.
    - Wrapped Neon + Drizzle in a single `db` instance and plugged it into Better Auth’s drizzle adapter.
- Result:
    - Stable local dev + build
    - Typed `App.Locals` with `user` and `session` for server routes

**Check-in flow**

- First pass: after login, users landed on the **dashboard**. Check-ins were another page.
- That felt wrong for the ritual I wanted.
- Change:
    - Root `/` and login success both redirect to **`/checkin`**.
    - Check-in form:
        - 3 sliders: **Clarity, Execution, Quality** (1–5)
        - Reflection (10–500 chars, required)
        - Optional tag: `momentum`, `risk`, `blocked`, `neutral`
    - Existing weekly check-in = pre-filled form + clear revision notice.

**Dashboard and data modeling**

- Dashboard server route computes:
    - Current week’s check-ins + member names
    - Trend data for last 8 weeks (avg/min/max per dimension)
    - Member-level breakdown
    - Tag distribution (all time)
    - Week-over-week deltas for each dimension
- Observable Plot-powered charts:
    - Area + line chart for trends
    - A custom **radar chart** to visualize this week’s scores
    - Member heatmap and tag distribution chart

**Theming and branding**

- Renamed from **Product Pulse** to **Sentio** with the tagline:**“Understand what your product team really sees.”**
- Rebuilt the visual system:
    - Dark base (`#0a0a0f`)
    - Neon accents (`#00f0ff`, `#39ff14`, `#ff2eaa`)
    - Glowing typography, focused cards, and a small custom favicon and nav mark.

### Phase 3 — Refinement and Discord Integration

I have to be honest here: **I didn’t create a smaller project to test.** As soon as I realized how complex Slack was, I created a server on Discord and went all-in. I’m happy as I learnt ‘touching’ stuff and I fell even more inlove with Discord on top of any other look-alike tool.

**Discord webhook (write) integration**

- API route: `POST /api/discord-pulse`
    - Fetches team by ID and week, computes averages, tags, and top reflections.
    - Posts a single embed to a team-specific Discord webhook.
- Client side: `WeeklySummary.svelte`
    - Shows a plain-text preview of the message.
    - One-click button to send to Discord with optimistic feedback and error handling.
- I made a mistake…
    - I initially pasted a **channel URL** (`/channels/...`) instead of a **webhook URL** (`/api/webhooks/...`).
    - Discord responded with HTML, and the server treated `status 200` as success.
    - Fix:
        - Validation in settings: only accept URLs starting with `https://discord.com/api/webhooks/`.
        - HTML-response detection on the API route; helpful error message if misconfigured.

**Discord `#general` (read) integration**

It was so fun when I learnt I had to create a Discord bot!!!

- New API route: `GET /api/discord-general`
    - Uses a **Discord bot token** + `DISCORD_GENERAL_CHANNEL_ID`.
    - Fetches recent messages from `#general`.
    - Extracts text-only snippets; no author, no IDs.
    - Filters by keywords and prefixes (e.g. `status:`, `update:`, `blocker:`, `risk:`, `on-track:`, `celebrate:`, `bug:`).
    - Handles Discord’s message content intent and error modes.
- Dashboard:
    - Loads `generalSignals` via a server-side fetch to `/api/discord-general`.
    - Renders them as a **“Signals from #general (Discord)”** card with:
        - Emoji per sentiment (🚀, ⚠️, ⛔️, 🐞, 📝)
        - A small tag chip (e.g. `blocker`)
        - Stripped message text (prefix removed)
        - A clear footnote: **usernames are never stored or shown**.

**Delight in the check-in flow**

- Made `/checkin` visually and emotionally inviting (still feel I have to improve this feature in the future):
    - Copy that makes it feel like a small weekly ritual, not a survey.
    - Neon-highlighted sliders with “Low / High” rails and big live numbers.
    - Rich textarea prompt about “what’s actually happening this week”.
    - Full-width primary CTA: **“Save this week”** instead of generic “Submit”.

---

## 6. Key Milestones

- Migrated from **Vue + Supabase** to **SvelteKit + Neon + Better Auth** without losing the product’s intent.
- Implemented **server-side auth**, DB, and routing with Drizzle and SvelteKit.
- Designed and built:
    - Weekly check-in flow as the **post-login landing**.
    - A rich **dashboard** with trends, radar, member heatmap, tags.
- Shipped **Discord webhook integration** for weekly recaps.
- Shipped **Discord `#general` reader** that:
    - Uses a real bot
    - Reads recent messages
    - Filters down to status-like snippets and anonymizes them
- Added **seeding scripts** to generate synthetic data for three archetypal teams:
    - Nebula Labs
    - Orbit Engine
    - Patchwork Co

---

## 7. Challenges & How They Were Solved

### Challenge 1 — Stack pivot mid-build

- **What happened**
I had a running Vue + Supabase app when Supabase limitations forced me to drop it. The course expected SvelteKit + Neon anyway.
- **Why it was difficult**
Throwing away my first stack under a 2‑week window is painful; I am not a good solution architect (yet). Also, I thought at the beginning it was going to be more painful.
- **How it was solved**
I kept the **data model and flows** and re-implemented everything in SvelteKit, borrowing just the conceptual structure (auth, teams, check-ins, dashboard, Discord).
- **What I learned**
Don’t marry the first implementation. Anchoring on data and flows made the technical pivot survivable.

### Challenge 2 — Environment variables and Better Auth

- **What happened**
Better Auth and Drizzle both failed at build time because they read `process.env` at import, before SvelteKit had envs wired in.
- **Why it was difficult**
The failures looked like generic runtime errors, not obviously related to env loading.
    - **How it was solved**
        - Switched to `$env/dynamic/private` within SvelteKit.
        - Ensured DB and auth were configured once, with lazy access where needed.
    - **What I learned**
    Leaning into the framework’s env conventions (`$env/*`) saves time and makes deployment at Netlify less fragile. This was a very good insight for me as I usually struggle with env variables.

### Challenge 3 — Discord HTML “success” responses

- **What happened**
When I misconfigured the webhook URL, Discord returned an HTML page with status 200; my API route treated that as a success.
- **Why it was difficult**
There was no visible error in the UI — the button said “Sent!”, but nothing appeared in Discord.
- **How it was solved**
    - Checked the Discord docs and noticed I had used a **channel URL**, not a **webhook URL.** 🙂
    - Added validation on save + HTML body guard on the API route.
- **What I learned**
Treat external integrations as hostile until proven friendly; and read more!!!

### Challenge 4 — Reading from `#general` with a bot

- **What happened**
The Discord bot returned an array of messages with **empty content** — or worse, I saw only empty lists (for a while).
- **Why it was difficult**
The cause was buried in Discord’s **Message Content Intent** setting; nothing in the HTTP response itself screamed intent missing.
- **How it was solved**
    - Added `debug` payloads to the `/api/discord-general` response (status, body snippets).
    - Confirmed messages existed but content was blank.
    - Enabled “Message Content Intent” in the bot configuration.
- **What I learned**
When integrating with third-party APIs, it was a great idea to add explicit diagnostic requests (just as we used to do with console.logs ten years ago.

### Challenge 5 — Making the check-in feel like a ritual, not a chore

- **What happened**
The first pass of the check-in page was functionally fine but emotionally flat.
- **Why it was difficult**
It’s easy to build a generic “form with sliders” and call it done, especially under time pressure.
- **How it was solved**
    - Changed copy to make it feel like “saving this week” instead of filling a survey.
    - Brought in subtle neon gradients, big animated numbers, and supportive hints for each dimension.
    - Made check-in the **first view after login**, not hidden behind a nav.
- **What I learned**
UX tone and visual treatment dramatically changed the perceived weight of the task without changing the flow.

---

## 8. Collaboration Model

This was a **solo build with AI as a pairing partner**, not an AI demo.

- I used AI to:
    - Architecture decisions (e.g. SvelteKit).
    - Draft and refine server routes, flows, definitions, and UI components.
    - Debug **hairy** integration issues (Discord).
- I remained responsible for:
    - The product framing (what’s in scope, what’s ritual vs. feature creep).
    - Trade-off calls (choosing Discord over Slack, read-only bot).
    - Final API shapes, data modeling, and UX details.

The loop looked like: 

- **sketch intent**
- **co-design implementation with AI**
- **run, test, and adjust**.

Logs and errors, not guesses, drove most of the hard fixes, debugging in pair programming with AI 😊

---

## 9. Final Outcome

**What Sentio does now**

- **Auth and teams**
    - Email + password auth via Better Auth
    - Create a team or join via 6‑character invite codes
- **Weekly check-ins**
    - Three 1–5 sliders: Clarity, Execution, Quality
    - Required reflection (10–500 chars)
    - Optional weekly tag (`momentum`, `risk`, `blocked`, `neutral`)
    - One check-in per user per team per week, with revisions allowed
- **Dashboard**
    - This week’s scores with neon-coded statuses
    - 8‑week trend chart (avg/min/max) via Observable Plot
    - Radar view of this week’s dimensions
    - Member heatmap for the current week
    - All-time tag distribution
    - Week-over-week deltas for each dimension
- **Discord integrations**
    - One-click **“Share to Discord”** embed for weekly pulse
    - A **“Signals from #general (Discord)”** panel, showing anonymized, tagged snippets like:
        - `🚀 on-track — ready for Thursday release`
        - `⛔️ blocker — shipping is blocked by API auth`
        - `⚠️ risk — might slip if design doesn’t land today`

Compared to the initial version, the final product:

- Centered the **check-in ritual** right after login.
- Exposed more data (per-member, per-week, sentiment tags).
- Brought **ambient signals** from Discord into the same visual frame as the structured check-ins.

---

## 10. Impact

This project helps me demonstrate:

- **Product thinking**
    - Turning a fuzzy idea (“product pulse”) into a concrete weekly ritual.
    - Designing features that reinforce behavior (post-login check-in, Discord tags).
- **Full-stack execution**
    - Implementing auth, DB modeling, server routes, and UI in a modern JS stack.
    - Handling external integrations responsibly (Discord webhooks + bots).
- **Iteration under constraints**
    - Navigating a stack pivot without losing the product story.
    - Making deliberate decisions about scope and polish to ship a coherent slice.

---

## 11. Key Learnings

1. **Rituals beat dashboards.**
    
    For this use case, making the check-in the first post-login view matters more than any individual chart.
    
2. **Anchoring on the data model makes stack changes survivable.**
    
    Keeping `teams`, `team_members`, and `checkins` stable let me switch from Vue/Supabase to Svelte/Neon without losing momentum.
    
3. **Integrations need care, not just happy paths.**
    
    Validating Discord webhooks and detecting HTML responses prevented “silent successes” that weren’t successes at all.
    
4. **Debug surfaces are a product decision too.**
    
    Adding tiny `debug` blocks to API responses during development let me reason about Discord issues quickly, instead of guessing.
    
5. **Ambient signals are powerful when they’re constrained.**
    
    Reading all of `#general` would be creepy and noisy; filtering for explicit `status:`/`update:`/`blocker:` posts and stripping identity makes it both safer and more useful.
    
6. **Delight is often a thin layer, but a meaningful one.**
    
    The dark neon theme, glowing scores, emojis, and tag chips are thin layers of CSS and copy, but they change how the tool *feels* to use for something as sensitive as team sentiment.
    

---

## 12. What I Would Do Next

If I had another iteration, I’d explore:

- **Richer “alignment” signals**
    - Compare individual check-ins vs. team average to highlight misalignment (e.g. one person sees massive risk while everyone else is green).
- **Slack and email parity**
    - Add equivalent Slack integrations and email digests for teams off Discord.
- **Better timeline narratives**
    - Generate short weekly narratives (e.g. “Execution up, clarity down, 3 new blockers from #general”) for leadership reviews.
- **Fine-grained Discord filters**
    - Let admins configure which prefixes should show in the dashboard and optionally map them to dimensions (e.g. `on-call:` → quality).
- **Multi-team and leadership views**
    - An “org view” where a director can compare several teams’ pulses and signals side by side.
- Improve teams organization
    - I didn’t have enough time to properly organize data to split into Organizations > Teams > Project. I had to make myself able to watch it all. I would love to create an Admin dashboard.

The current capstone version is intentionally a slice, not a platform. For me, it is a functional mockup, but it already demonstrates the throughline I care about: **connecting how a team feels with what they say and what they’re shipping.**