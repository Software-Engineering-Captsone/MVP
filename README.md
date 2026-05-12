# NILINK

> A two-sided NIL (Name, Image, Likeness) marketplace connecting verified college athletes with brands.

NILINK is a marketplace platform for college athletes and brands to manage NIL partnerships from discovery through completed deal work. Athletes can create verified profiles, showcase social reach and content samples, discover campaigns, apply to opportunities, review offers, and manage deliverables. Brands can create campaigns, search athletes, review applications, send offers, upload contracts, track submissions, and manage payouts from a role-aware dashboard.

**Live site:** [https://mvp-inky-eta.vercel.app/](https://mvp-inky-eta.vercel.app/)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [User Documentation](#user-documentation)
4. [Technical Documentation](#technical-documentation)
   - [Tech Stack](#tech-stack)
   - [Architecture Overview](#architecture-overview)
   - [Repository Structure](#repository-structure)
   - [Important Routes](#important-routes)
   - [API Surface](#api-surface)
   - [Data Model](#data-model)
5. [Local Development](#local-development)
6. [Supabase Setup](#supabase-setup)
7. [Available Scripts](#available-scripts)
8. [Environment Variables](#environment-variables)
9. [Testing & Quality Gates](#testing--quality-gates)
10. [Deployment Notes](#deployment-notes)
11. [Current MVP Scope](#current-mvp-scope)
12. [Credits](#credits)

---

## Project Overview

NILINK was built as a full-stack software engineering capstone MVP for the NIL partnership workflow. The product supports two primary user roles:

- **Athletes:** build a profile, verify school information, browse brand opportunities, save campaigns, apply, accept or decline offers, submit deliverables, and track active deals.
- **Brands:** create company profiles, launch campaigns, review applicants, draft offers, manage signed deals, review athlete submissions, and monitor campaign/deal analytics.

The app is designed around a shared partnership lifecycle:

1. A user signs up as an athlete or brand.
2. The user completes role-specific onboarding.
3. Brands publish campaigns and discover athletes.
4. Athletes discover campaigns and apply.
5. Brands review applications and send offers.
6. Accepted offers become deals with contracts, deliverables, review states, and payout tracking.

## Core Features

- Role-based authentication and onboarding with Supabase Auth.
- Athlete marketplace search and saved athletes/brands/campaigns.
- Athlete profile editor with sports, academics, verification, NIL compliance, availability, social metrics, achievements, and content portfolio sections.
- Brand profile editor and campaign creation workflow.
- Campaign application queue for brands.
- Offer drafting, sending, accepting, and declining.
- Deal workspace for contract review, deliverables, submission review, revision requests, publishing, cancellation, and payout status.
- In-app messaging and application/deal activity surfaces.
- Dashboard analytics for athlete and brand views.
- Supabase Row Level Security policies and server-side API routes for protected data access.

## User Documentation

### Public Site

- Visit the live deployment at [https://mvp-inky-eta.vercel.app/](https://mvp-inky-eta.vercel.app/).
- The landing page explains the NILINK product, feature set, pricing surface, demo page, and contact form.
- Use **Sign In** or the primary call-to-action buttons to open the authentication page.

### Athlete Flow

1. Go to `/auth` and create an account with the **Athlete** role selected.
2. Confirm the account if email verification is enabled.
3. Complete athlete onboarding at `/dashboard/onboarding`.
4. Use the dashboard to:
   - Review NIL activity on `/dashboard`.
   - Discover campaigns and brands on `/dashboard/search`.
   - Track submitted applications on `/dashboard/applications`.
   - Review offers on `/dashboard/offers`.
   - Manage active deals on `/dashboard/deals`.
   - Edit the public athlete profile on `/dashboard/profile`.
   - View the public profile preview on `/dashboard/profile/view`.

### Brand Flow

1. Go to `/auth` and create an account with the **Brand** role selected.
2. Confirm the account if email verification is enabled.
3. Complete brand onboarding at `/dashboard/onboarding`.
4. Use the dashboard to:
   - Review brand activity on `/dashboard`.
   - Search athletes on `/dashboard/search`.
   - Create and manage campaigns on `/dashboard/campaigns`.
   - Review athlete applications inside campaign details.
   - Create offer drafts and send offers.
   - Manage contracts, deliverables, submissions, cancellations, and payouts on `/dashboard/deals`.
   - Review performance metrics on `/dashboard/analytics`.
   - Update the brand profile on `/dashboard/profile`.

## Technical Documentation

### Tech Stack

- **Framework:** Next.js 16 App Router (React Compiler enabled)
- **UI:** React 19, TypeScript, Tailwind CSS 4, custom CSS tokens
- **Backend:** Next.js route handlers under `src/app/api`
- **Database / Auth / Storage / Realtime:** Supabase (via `@supabase/ssr`)
- **Data fetching:** SWR + Supabase clients
- **Charts / visuals:** Recharts, Framer Motion, Lucide React
- **Email:** Nodemailer SMTP (Gmail App Password in the current MVP), with Resend support retained for future use
- **Testing:** Vitest
- **Deployment:** Vercel

### Architecture Overview

NILINK is a single Next.js App-Router application that talks directly to Supabase for both data and auth. There is no separate backend server — server-side logic lives in Route Handlers under `src/app/api/**`.

```
Browser ──► Next.js (App Router)
             ├─ Server Components ── Supabase SSR client (cookies)
             ├─ Route Handlers /api ── Supabase service-role client
             └─ Client Components ── SWR ──► /api/* ──► Supabase
                                                       (Postgres + RLS + Realtime + Storage)
```

**Auth flow.** Cookies are managed by `@supabase/ssr` via middleware in `src/lib/middleware.ts`. Athlete onboarding requires a `.edu` email; verification codes are sent via SMTP (`/api/verify/school-email/send`). University selection uses an upstream list with a bundled fallback when the source is unavailable.

**Authorization.** Every domain table has Row Level Security policies; helper functions are locked to the `authenticated` role. Service-role access is restricted to server routes (`SUPABASE_SERVICE_ROLE_KEY` is never bundled to the client).

**Realtime.** Chat (`conversations`, `messages`) and deal activity feeds use Supabase Realtime publications (`supabase-chat-realtime-publication.sql`, `supabase-deals-realtime-publication.sql`).

**Storage.** Avatars, banners, and signed deal contracts use Supabase Storage buckets configured in `supabase-storage-setup.sql` and `supabase-storage-deal-contracts.sql`.

**Toggleable data sources** (for local dev / demos):
- `NEXT_PUBLIC_MARKETPLACE_DATA_SOURCE=mock` — serve bundled fixtures from `src/lib/mockData.ts` instead of live Supabase.
- `NEXT_PUBLIC_SAVED_DATA_SOURCE=local` — persist saved lists to `localStorage` instead of the DB.

### Repository Structure

```text
src/app/                         Next.js pages, layouts, loading states, and API routes
src/app/api/                     Server-side route handlers for auth, campaigns, offers, deals, chat, dashboards
src/components/auth/             Authentication UI
src/components/landing/          Public marketing and product overview pages
src/components/onboarding/       Shared onboarding shell
src/components/dashboard/        Dashboard layout, cards, and role-specific screens
src/components/offers/           Offer wizard and offer review UI
src/lib/                         Supabase clients, repositories, validators, adapters, mock data, business logic
src/hooks/                       Shared React hooks
src/styles/                      Tailwind layers + globals
scripts/                         Utility scripts such as demo athlete seeding
supabase/                        Supabase CLI project (config, generated types, migrations)
supabase-*.sql                   ~25 root-level setup, RLS, storage, RPC, chat, campaign, application, offer, and deal scripts
tests/                           Vitest suites
public/                          Static assets
data/                            Local JSON stores for legacy/mock paths
```

### Important Routes

| Route | Purpose |
| --- | --- |
| `/` | Public NILINK landing page |
| `/auth` | Sign in and sign up |
| `/auth/callback` | Supabase auth callback |
| `/dashboard` | Role-aware dashboard home |
| `/dashboard/onboarding` | Athlete or brand onboarding |
| `/dashboard/search` | Athlete/brand/campaign discovery |
| `/dashboard/campaigns` | Campaign management |
| `/dashboard/applications` | Athlete application tracking |
| `/dashboard/offers` | Offer review and offer actions |
| `/dashboard/deals` | Deal pipeline |
| `/dashboard/deals/[dealId]` | Deal workspace |
| `/dashboard/messages` | Inbox and messages |
| `/dashboard/profile` | Profile editor |
| `/dashboard/profile/view` | Public profile preview |
| `/dashboard/analytics` | Analytics dashboard |
| `/watch-demo` | Demo video page |
| `/talk-to-sales` | Sales/contact form |

### API Surface

The backend is implemented with Next.js route handlers. Major API groups include:

- `src/app/api/auth/*` for email/password auth helpers, password reset, verification, and current-user metadata.
- `src/app/api/dashboard/*` for athlete and brand dashboard overview data.
- `src/app/api/marketplace/*` for athlete and brand marketplace data.
- `src/app/api/campaigns/*` for campaign CRUD, templates, applications, referrals, match previews, and offer handoff.
- `src/app/api/applications/*` for application status and messages.
- `src/app/api/offers/*` for direct drafts, chat drafts, send, accept, decline, and offer detail.
- `src/app/api/deals/*` for deal detail, status transitions, contract handling, cancellation, and deal workspace state.
- `src/app/api/deliverables/*`, `src/app/api/submissions/*`, and `src/app/api/payment/*` for deal execution.
- `src/app/api/chat/*` for outreach, inbox, threads, messages, and read state.
- `src/app/api/social/*` for optional social OAuth/token integrations.

### Data Model

All tables live in the `public` schema. The full DDL is split across ~25 SQL migration files at the repo root (`supabase-*.sql`); the foundational file is `supabase-setup.sql`.

#### Core identity
| Table | Purpose |
|---|---|
| `profiles` | Universal fields for every user (email, role, location, gender, avatar/banner, availability, verification). Linked 1:1 to `auth.users`. |

#### Athlete side
| Table | Purpose |
|---|---|
| `athlete_sports` | Sport(s), position, school team, season. |
| `athlete_academics` | University, major, graduation year, GPA. |
| `athlete_socials` | Instagram / TikTok / YouTube handles + follower metrics ingested via OAuth. |
| `athlete_achievements` | Awards, stats, milestones (free-form list). |

#### Brand side
| Table | Purpose |
|---|---|
| `brand_profiles` | Company name, industry, website, contacts. |
| `campaigns` | Campaign briefs (title, description, budget, filters, status). |
| `applications` | Athlete → campaign applications, with `status` lifecycle (`pending` → `under_review` → `offer_sent` / `rejected`). |
| `saved_athletes` | Brand shortlists / saved-search results. |
| `saved_campaigns` | Athlete-side saved campaigns. |
| `campaign_templates` | Reusable starter briefs. |
| `offers` | Direct (off-campaign) offers from brand to athlete. |

#### Deals (phased lifecycle)
| Table | Purpose |
|---|---|
| `deals` | Contracted engagement between athlete and brand (Phase 3: setup). |
| `deal_deliverables` | Per-deliverable spec, status, published URL (Phase 4). |
| `deal_activities` | Audit / activity feed for the deal (Phase 5). |

Deal lifecycle phases are documented in `supabase-deals-phase{3,4,5}-setup.sql`.

#### Messaging
| Table | Purpose |
|---|---|
| `conversations` | A 1:1 thread between a brand and an athlete. |
| `messages` | Individual messages with realtime delivery. |

#### Auxiliary
| Table | Purpose |
|---|---|
| `referrals` | Referral tracking. |

> **Migration run-order:** apply `supabase-setup.sql` and `supabase-business-setup.sql` first, then the domain files (campaigns, applications, deals phases, chat, storage), and finally the hardening / patch files (`supabase-rls-hardening.sql`, `supabase-rls-recursion-fix.sql`, and any `*-patch.sql`). See the comments at the top of each file for prerequisites.

## Local Development

### Prerequisites

- Node.js 20 or newer
- npm
- Supabase project credentials
- SMTP credentials for school-email OTP delivery

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the required Supabase values in `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Add SMTP credentials for athlete school-email OTP delivery:

   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-google-app-password
   SMTP_FROM="NILINK <your-email@gmail.com>"
   ```

   For Gmail SMTP, enable 2-Step Verification on the Google account and create a Google App Password. Use the full Gmail address as `SMTP_USER`; do not use the normal Google password.

5. Add optional social integrations if needed:

   ```bash
   INSTAGRAM_APP_ID=
   INSTAGRAM_APP_SECRET=
   TIKTOK_CLIENT_KEY=
   TIKTOK_CLIENT_SECRET=
   YOUTUBE_CLIENT_ID=
   YOUTUBE_CLIENT_SECRET=
   ```

6. Run the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

> The dev server uses Webpack (not Turbopack) — this is intentional and configured in `next.config.ts`.

## Supabase Setup

The project uses Supabase for authentication, database tables, storage, RPC functions, and Row Level Security. SQL setup files are included in the repository root and in `supabase/migrations/`.

For a fresh Supabase environment:

1. Create a Supabase project.
2. Add the project URL, anon key, and service role key to `.env.local` and Vercel environment variables.
3. Apply the schema/setup SQL files in the order described under [Data Model](#data-model) — profiles, athlete data, brand data, campaigns, applications, offers, deals, chat, storage, social OAuth, RPC helpers, and finally the RLS hardening files.
4. Confirm the `deal-contracts` storage bucket and storage policies are present if testing contract uploads.
5. Configure auth redirect URLs for local development and production:
   - `http://localhost:3000/auth/callback`
   - `https://mvp-inky-eta.vercel.app/auth/callback`
6. Configure Supabase Auth SMTP for signup verification, verification resends, and forgot-password emails. For the current MVP Gmail setup:
   - Sender email address: the full Gmail address used for SMTP
   - Sender name: `NILINK`
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: the full Gmail address
   - Password: the Google App Password

The app also uses SMTP directly for athlete `.edu` OTP codes through `/api/verify/school-email/send`; configure the same `SMTP_*` variables in Vercel.

Demo athlete accounts can be seeded into the configured Supabase project with:

```bash
npm run seed:demo-athletes
```

The seed script reads `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `DEMO_ATHLETE_PASSWORD`.

## Available Scripts

```bash
npm run dev                  # Start local Next.js development server
npm run build                # Build production app
npm run start                # Start production build locally
npm run lint                 # Run ESLint
npm run test                 # Run Vitest test suite
npm run test:watch           # Run Vitest in watch mode
npm run seed:demo-athletes   # Seed demo athlete profiles into Supabase
```

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by client and server code |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase service role key for privileged API/script actions |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical app URL for redirects |
| `SMTP_HOST` | Yes | SMTP server for athlete school-email OTP delivery |
| `SMTP_PORT` | Yes | SMTP server port, usually `587` for Gmail STARTTLS |
| `SMTP_USER` | Yes | SMTP username, usually the full sender email address |
| `SMTP_PASS` | Yes | SMTP password or provider app password |
| `SMTP_FROM` | Recommended | Display sender for app-generated OTP email, for example `NILINK <name@gmail.com>` |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Optional | Instagram OAuth integration |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Optional | TikTok OAuth integration |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | Optional | YouTube OAuth integration |
| `NEXT_PUBLIC_MARKETPLACE_DATA_SOURCE` | Optional | Set to `mock` to use bundled marketplace fixtures |
| `NEXT_PUBLIC_SAVED_DATA_SOURCE` | Optional | Set to `local` to use browser localStorage saved lists |
| `NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL` | Optional | Hosted demo video embed URL |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` | Optional | Direct demo MP4 URL |
| `NEXT_PUBLIC_DEMO_VIDEO_POSTER_URL` | Optional | Demo video poster image |
| `CONTACT_SALES_TO` | Optional | Inbox for the `/talk-to-sales` form |

## Testing & Quality Gates

Before pushing, the project expects all three to pass:

```bash
npm run lint           # ESLint
npx tsc --noEmit       # Type-check
npm run test           # Vitest
```

CI / pre-merge baseline: **0 type errors, 0 ESLint errors, all tests green.**

## Deployment Notes

Production is deployed on Vercel at [https://mvp-inky-eta.vercel.app/](https://mvp-inky-eta.vercel.app/).

Before deploying a new environment:

1. Add all required environment variables in Vercel (see table above). Set `NEXT_PUBLIC_APP_URL` to the production URL.
2. Confirm Supabase Auth redirect URLs include the Vercel domain.
3. Configure OAuth redirect URIs in the Instagram / TikTok / YouTube developer consoles using `<NEXT_PUBLIC_APP_URL>/api/social/*/callback`.
4. Apply the latest Supabase SQL migrations/setup scripts.
5. Run the quality checks locally:

   ```bash
   npm run lint
   npm run test
   npm run build
   ```

## Current MVP Scope

This repository represents the capstone MVP. It includes the complete user-facing workflow for account creation, onboarding, discovery, campaign/application management, offer handoff, deal workspaces, and dashboard analytics. Payment processing and external social-platform metrics are represented through application data models and integration-ready OAuth surfaces, but real money movement and production social API approval are outside the current MVP scope.

## Credits

Software Engineering capstone project. 
*Samip Udas*
*Pratuish Karki*
*Jorge Gonzalez*
*Diogo Santos*
*Shanya Poudel*
*Class of 2026*