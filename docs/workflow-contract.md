# Workflow domain contract (MVP)

This document is the **baseline product boundary** for campaign → application → offer. Phase 2 (direct profile / chat-negotiated offer endpoints) is **out of scope** here; the data model already reserves `offerOrigin` lanes and nullable campaign/application linkage for those flows.

## Entities

### Campaign — **WHO only**

- Targeting, visibility, sourcing, filters, opportunity context, non-binding budget hints.
- **Must not** own binding execution terms, compensation, contract language, or athlete-specific negotiated deal fields that belong on the offer/deal layer.

### Application — **bridge**

- Links `campaignId` + `athleteUserId` and carries application workflow state (status, pitch, messages, snapshot).
- **Required:** `source`: `'regular' | 'referral'`.
- **Optional:** `referralMeta` when tracking referral context:
  - `inviterUserId` (string)
  - `origin`: `'profile' | 'chat' | 'manual'`
  - `timestamp` (ISO date)
  - `note` (string)
- Legacy rows without `source` are treated as **`regular`** at validation and API boundaries.

### Offer — **WHAT + HOW MUCH** (scaffold today)

- **Required:** `brandUserId`, `athleteUserId`, `offerOrigin`.
- **Required:** `offerOrigin`: `'campaign_handoff' | 'direct_profile' | 'chat_negotiated'`.
- **Campaign lane (`campaign_handoff`):** `campaignId` and `applicationId` are **required** and must match the approved application being handed off.
- **Direct / chat lanes (reserved):** `campaignId` / `applicationId` may be **null/omitted** until those endpoints exist; `brandUserId` and `athleteUserId` remain mandatory.
- Legacy rows missing `brandUserId` may be **derived** from linked campaign on read/write normalization when `campaignId` is present; otherwise writes **reject** invalid offers.

## Invariants

1. Campaign/offer boundary: no offer-owned execution fields stored on campaign; no campaign-owned targeting duplicated as binding terms on offer.
2. Idempotency: campaign handoff `POST .../campaigns/[id]/offers` remains idempotent per `(campaignId, applicationId)` for `campaign_handoff` drafts.
3. Auth/ownership: unchanged — brand must own campaign for handoff; athletes/brands access applications per existing rules.

## API serialization

- Applications expose `source` and optional `referralMeta` (ISO timestamps in JSON).
- Offers expose `offerOrigin`; `campaignId` / `applicationId` may be null for non-campaign lanes when implemented.
