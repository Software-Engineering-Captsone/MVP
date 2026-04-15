# Campaign Creation V2 Spec

## Goal

Define a concrete V2 campaign-creation spec that builds on the current shipped baseline and closes business-critical gaps:

- Better field quality for business outcomes and campaign execution.
- Better information architecture (no low-value steps with 1 field).
- Template system replacing hardcoded presets.
- Strong publish-time completeness and launch readiness checks.

This spec is written as a **delta from current implementation** (`CreateCampaignOverlay`, campaign APIs, publish validation, draft resume, offer handoff, match preview versioning/staleness).

## Current Baseline (Already Shipped)

- 7-step wizard: Presets, Basics, Audience & Social, Brand Fit, Sourcing, Location, Review.
- Publish matrix enforcement for all 7 steps (`validateCampaignPublishInput`).
- Draft save and reopen from campaign list.
- Offer handoff scaffold endpoint (`POST /api/campaigns/[id]/offers`) with campaign/offer separation.
- Match preview includes estimator `version`, `confidence`, `staleAfterMs`, refresh UX.

## V2 Product Outcomes

V2 must optimize for what businesses care about most:

1. Business outcome (objective + KPI targets)
2. Audience fit (who to reach and where)
3. Creator/output scope (deliverables by platform)
4. Budget/economics (cap, spend mix, payment model)
5. Brand safety/compliance (guardrails, disclosure, exclusions)
6. Execution workflow (timeline, approvals, revisions)
7. Rights/reuse (organic vs paid rights, duration)

## V2 Information Architecture (6 Steps)

Replace the current 7-step UX with these 6 grouped milestones:

1. Campaign Strategy
2. Audience & Creator Fit
3. Content & Deliverables
4. Budget & Rights
5. Sourcing & Visibility
6. Review & Launch

### Step 1: Campaign Strategy

Required fields:

- `campaignName` (string, 3-120 chars)
- `objectiveType` (enum: `awareness | consideration | conversion | ugc_library`)
- `primaryKpi` (enum: `reach | engagement_rate | ctr | cpa | leads | sales`)
- `primaryKpiTarget` (number; units depend on KPI)
- `flightStartDate` (ISO date)
- `flightEndDate` (ISO date; must be >= start)
- `marketRegion` (string, e.g. `US`, `US-TX`, `Global`)

Optional:

- `secondaryKpi` (same KPI enum)
- `secondaryKpiTarget` (number)
- `campaignSummary` (string)

### Step 2: Audience & Creator Fit

Required:

- `audiencePersona` (string or template key)
- `sportCategory` (string; `All Sports` allowed only in draft, not publish)
- `followerRangeMin` (number >= 0)
- `engagementRateMinPct` (number 0-100)
- `audienceGeoRequirement` (enum: `strict | preferred | open`)

Optional:

- `subNiche` (string)
- `genderFilter` (enum: `Any | Men | Women | Non-binary | Custom`)
- `languagePreferences` (string[])
- `ageBand` (enum/string)
- `creatorExclusions` (string[]; competitor programs, risk topics, restricted affiliations)

### Step 3: Content & Deliverables

Required:

- `platforms` (enum[]: `instagram | tiktok | youtube | x | linkedin | other`)
- `deliverableBundle` (array of objects with format + quantity)
- `ctaType` (enum: `learn_more | shop_now | sign_up | apply | custom`)
- `messagePillars` (string[], min 1)

Optional:

- `mustSay` (string[])
- `mustAvoid` (string[])
- `creativeAngle` (string)
- `draftRequired` (boolean; default true)
- `revisionRounds` (integer >= 0)
- `publishCadence` (string)

Deliverable object:

```ts
type DeliverableSpec = {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'x' | 'linkedin' | 'other';
  format: 'reel' | 'story' | 'post' | 'short' | 'video' | 'ugc_photo' | 'custom';
  quantity: number; // >= 1
  notes?: string;
};
```

### Step 4: Budget & Rights

Required:

- `budgetCap` (number > 0, currency minor units or decimal)
- `paymentModel` (enum: `flat` | `performance` | `hybrid`)
- `usageRights.mode` (enum: `organic_only | paid_usage`)
- `usageRights.durationDays` (number > 0)

Optional:

- `targetCreatorCount` (integer > 0)
- `spendSplitByTier` (object; `nano`, `micro`, `mid`, `macro`)
- `performanceIncentives` (string/object)
- `exclusivityWindowDays` (integer >= 0)
- `usageRights.channels` (enum[]: `meta_ads | tiktok_ads | youtube_ads | web | email`)
- `usageRights.whitelistingEnabled` (boolean)

### Step 5: Sourcing & Visibility

Required:

- `acceptApplications` (boolean)
- `visibility` (enum: `public | invite_only | private`)
- `shortlistStrategy` (enum: `manual | assisted`)

Optional:

- `autoApproveRules` (rule object[])
- `discoverySources` (enum[]: `marketplace | previous_partners | lookalikes | crm_import`)
- `invitedCreatorIds` (string[]) for `invite_only`/`private`

### Step 6: Review & Launch

System-generated + confirmation:

- Completeness score by section
- Blocking issues list
- Match estimate + confidence + version + staleness
- Cost forecast range from chosen deliverables and budget
- Risk flags (missing geo, broad audience, rights mismatch, no KPI target, etc.)
- `reviewConfirmed` (boolean, required for publish)

## Data Model (V2 Payload)

Keep backward compatibility by introducing a structured `campaignBriefV2` object while retaining current top-level fields during migration.

```ts
type CampaignBriefV2 = {
  schemaVersion: 'campaign_brief_v2';
  strategy: { /* step 1 */ };
  audienceCreatorFit: { /* step 2 */ };
  contentDeliverables: { /* step 3 */ };
  budgetRights: { /* step 4 */ };
  sourcingVisibility: { /* step 5 */ };
  reviewLaunch: {
    reviewConfirmed: boolean;
    lastReviewedAt?: string;
  };
  templateMeta?: {
    templateId?: string;
    templateVersion?: number;
    source: 'system' | 'org' | 'blank';
    lockOverrides?: string[]; // dotted paths locked by policy
  };
};
```

### Backward-Compatible Mapping

During migration:

- Continue writing legacy fields (`goal`, `sport`, `brandFitTags`, etc.) for existing UI consumers.
- Add a server mapper:
  - `campaignBriefV2 -> legacy campaign fields` (for current list/detail surfaces)
  - `legacy -> campaignBriefV2 defaults` (for old drafts opened in new wizard)

## Publish Validation Matrix (V2)

Publish intent fails when any condition below is unmet.

1. Strategy complete
   - Name, objective, primary KPI + target, valid flight dates, region set
2. Audience & creator fit complete
   - Category, min audience constraints, geo requirement, no invalid exclusion rules
3. Content & deliverables complete
   - At least one platform and one deliverable, CTA set, message pillar exists
4. Budget & rights complete
   - Budget cap > 0, payment model set, rights mode + duration set
5. Sourcing & visibility complete
   - visibility and acceptApplications explicitly set, shortlist strategy set
6. Review complete
   - reviewConfirmed true, no blocking risk flags

### Blocking vs Warning Rules

Blocking:

- Missing required field in any step
- Date range invalid
- KPI target missing/invalid
- Deliverables empty
- Budget cap missing/zero
- Rights missing

Warning (non-blocking unless policy toggled):

- Wide audience (likely low precision)
- No exclusions set
- Broad estimate confidence low
- No secondary KPI

## Template System (Replacing Hardcoded Presets)

### Template Types

- `system templates` (admin-owned)
- `org templates` (business-owned)

### Template Shape

```ts
type CampaignTemplate = {
  id: string;
  orgId?: string; // absent for system templates
  name: string;
  description?: string;
  version: number;
  status: 'active' | 'archived';
  defaults: CampaignBriefV2;
  lockedPaths?: string[]; // required policy fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

### Required Behaviors

- Start flow options: `Start from template` or `Start blank`.
- Template picker shows what gets prefilled.
- `Save as template` from current draft/campaign.
- Version pinning on campaigns:
  - Campaign stores `templateId` + `templateVersion` used at creation time.
  - Future template edits do not mutate existing campaigns.

## API Changes

### Campaign Endpoints

- `POST /api/campaigns`
  - Accept legacy payload plus optional `campaignBriefV2`.
  - If both present, `campaignBriefV2` is source of truth and server computes legacy mirrors.
- `PATCH /api/campaigns/[id]`
  - Same behavior for draft/publish.
- `GET /api/campaigns/[id]`
  - Return both:
    - `campaign` (legacy)
    - `campaignBriefV2` (new structured payload)

### Template Endpoints (new)

- `GET /api/campaign-templates?scope=system|org|all`
- `POST /api/campaign-templates` (create org template)
- `PATCH /api/campaign-templates/[id]` (new version or archive)
- `POST /api/campaigns/[id]/save-template` (derive template from campaign)

### Offer Handoff (existing)

No schema coupling change required:

- Keep offer creation in `/api/campaigns/[id]/offers`.
- Continue excluding execution terms from campaign brief.

## Match Estimator V2 Additions

Current versioning/staleness is good. Extend for V2:

- Include input fingerprint for reproducibility:
  - `inputHash` (hash of filter + deliverable + sourcing subset)
- Include estimator metadata:
  - `modelVersion` (e.g., `match_preview@2`)
  - `confidenceScore` (0-1 numeric) in addition to label
- UI refresh controls:
  - Explicit stale badge reasons
  - "Refresh now" and "Auto refresh every N min" toggle (optional)

## UX Requirements

- Show 3-6 core inputs at once; progressive reveal for advanced options.
- Named milestones instead of numeric-only steps.
- Persistent `Save draft` + autosave debounce (2-5 seconds).
- Inline helper text for complex fields (KPI targets, rights modes).
- Review page surfaces:
  - blocking errors first
  - then warnings
  - then preview/forecast.

## Migration Plan

### Phase 1: Backend Compatibility Layer

- Add `campaignBriefV2` storage field.
- Add mapping helpers (legacy <-> v2).
- Preserve existing clients and publish behavior.

### Phase 2: New Wizard UI

- Build V2 6-step UI behind feature flag (`campaignCreationV2`).
- Continue writing legacy mirrors for list/detail compatibility.

### Phase 3: Templates

- Add template CRUD APIs and picker UI.
- Replace hardcoded packages with template entities.

### Phase 4: Rule Hardening

- Move publish checks to V2 matrix with policy toggles.
- Add warning-to-blocking policy control by org/admin.

### Phase 5: Cleanup

- Deprecate old preset-only fields after all clients migrated.

## Acceptance Criteria

- Publish success requires all 6 V2 sections complete.
- Drafts can be reopened and edited with full state fidelity.
- Template selection + version pinning works end-to-end.
- Offer handoff remains decoupled from campaign terms.
- Review shows estimator version, confidence, staleness, and refresh actions.
- Legacy consumers still function during migration.

## Implementation Notes (References)

- Aspire brief essentials: https://www.aspire.io/blog/what-to-include-in-an-influencer-brief-plus-a-free-template
- Influencer Marketing Hub campaign brief structure: https://influencermarketinghub.com/how-to-create-an-influencer-campaign-brief/

