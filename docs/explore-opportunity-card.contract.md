# Explore Opportunity Card Contract

This document defines the implementation contract for the athlete Explore marketplace opportunity card.

Primary integration target: `MVP/src/components/dashboard/screens/AthleteExploreMarketplace.tsx`.

## Scope

- Applies to cards rendered in the Explore `opportunities` grid and `saved` grid.
- Focuses on UI structure, spacing rhythm, visual hierarchy, and reusable styling tokens.
- Does not change data-fetching behavior or application submission flows.

## Component API (TypeScript)

```ts
export type OpportunityCardChipLane = 'deliverable' | 'qualifier';

export type OpportunityCardChip = {
  id: string;
  label: string;
  lane: OpportunityCardChipLane;
  title?: string;
};

export type OpportunityCardCompensation = {
  display: string; // e.g. "$2,000-$3,500" (already formatted by caller)
  ariaLabel?: string;
};

export type OpportunityCardDeadline = {
  label: string; // e.g. "Closes May 1"
  urgency?: 'normal' | 'soon' | 'today';
};

export type OpportunityCardVisualState = {
  isSaved: boolean;
  isWithdrawn?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
};

export type OpportunityCardContent = {
  id: string;
  title: string;
  brandName: string;
  imageSrc: string;
  imageAlt: string;
  chips: OpportunityCardChip[]; // caller clamps to <= 3, with optional overflow chip
  deadline: OpportunityCardDeadline;
  compensation: OpportunityCardCompensation;
  ctaLabel?: string; // default: "View Deal"
};

export type OpportunityCardCallbacks = {
  onOpen: () => void;
  onToggleSave: () => void;
};

export type OpportunityCardProps = {
  content: OpportunityCardContent;
  state: OpportunityCardVisualState;
  callbacks: OpportunityCardCallbacks;
  className?: string;
  focusRingClassName?: string; // default shared focus ring token
  interactiveSurfaceClassName?: string; // default shared surface transition token
};
```

## Layout Blueprint (Production Contract)

- Card shell: rounded container with fixed internal sections.
- Internal order:
  1. Media + title block + save action
  2. Metadata chips row
  3. Deadline/withdrawn row
  4. Price + CTA anchored bottom
- The card root must be keyboard-focusable and act as a button.
- CTA and save button must stop event propagation so they do not double-trigger card open.

## Spacing & Rhythm Contract

Use these constants across the component only (8pt-based system):

- `cardPadding = 16`
- `topBlockGap = 12`
- `titleToBrandGap = 4`
- `brandToChipsGap = 12`
- `chipsToDeadlineGap = 12`
- `deadlineToBottomGap = 16`
- `chipGap = 6`
- `cardMinHeightDesktop = 272`
- `cardMinHeightMobile = 240`

Implementation rules:

- Never introduce one-off spacing values for card internals.
- Clamp title to 2 lines.
- Clamp chip display to 3 visible chips (or 2 + `+N more`).
- Keep CTA + compensation aligned at bottom using `mt-auto` or fixed row anchoring.

## Tailwind Token Map

The following map is the source of truth for styling extraction. It is intentionally tokenized for reuse across Explore + Saved cards.

```ts
export const opportunityCardTokens = {
  root: [
    'group rounded-3xl border border-gray-200/90 bg-white p-4 text-left shadow-sm',
    'min-h-[272px] md:min-h-[272px] min-[0px]:min-h-[240px]',
    'transition-[box-shadow,border-color,transform,background-color] duration-200 ease-out',
    'hover:-translate-y-px hover:border-gray-300/90 hover:shadow-md',
    'active:translate-y-0 active:shadow-sm motion-reduce:hover:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2',
  ].join(' '),

  layoutRow: 'flex items-start gap-3',
  mediaWrap: 'h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50',
  mediaImage: 'h-full w-full object-cover',

  headerWrap: 'min-w-0 flex-1',
  headerRow: 'flex min-h-[88px] items-start justify-between gap-2.5',
  title: 'line-clamp-2 text-[22px] font-bold leading-[1.08] tracking-tight text-gray-900',
  brand: 'mt-1 truncate text-sm font-semibold text-gray-600',

  saveButtonBase: 'inline-flex h-8 w-8 items-center justify-center rounded-full border',
  saveButtonSaved: 'border-blue-200 bg-blue-50 text-blue-600',
  saveButtonDefault: 'border-gray-200 bg-white text-gray-400 hover:text-gray-600',
  saveIcon: 'h-4 w-4',

  chipsRow: 'mt-2.5 flex flex-wrap items-center gap-1.5',
  chip: 'inline-flex max-w-full items-center truncate rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700',

  deadlineRow: 'mt-2.5 flex items-center justify-between gap-2 text-xs text-gray-600',
  deadlineLabel: 'inline-flex shrink-0 items-center gap-1',
  deadlineDotNormal: 'h-2.5 w-2.5 rounded-full bg-amber-400',
  deadlineDotSoon: 'h-2.5 w-2.5 rounded-full bg-orange-500',
  deadlineDotToday: 'h-2.5 w-2.5 rounded-full bg-red-500',
  withdrawnTag: 'text-[11px] font-semibold uppercase tracking-wide text-amber-700',

  bottomRow: 'mt-3.5 flex items-end justify-between gap-3',
  compensation: 'text-[30px] font-bold leading-none tracking-tight text-gray-900 tabular-nums',
  cta: 'h-10 rounded-xl bg-[#4F93E6] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3D83D9]',
} as const;
```

## State Variants

### Default

- `isSaved = false`
- Gray outline heart button.
- Deadline dot uses `deadlineDotNormal`.

### Saved

- `isSaved = true`
- Heart icon filled (`fill-current`) and blue-tinted button.

### Withdrawn

- `isWithdrawn = true`
- Shows withdrawn badge in deadline row.
- Card remains openable for detail review.

### Loading (Skeleton)

- Use fixed skeleton geometry matching card composition:
  - image block
  - title line + subtitle line
  - 2 chip pills
  - deadline line
  - compensation + CTA row
- Keep card dimensions stable to prevent layout shift.

### Disabled (optional future state)

- `isDisabled = true`
- Apply: `pointer-events-none opacity-60` at root.
- Remove hover/active transforms.

## Accessibility Contract

- Card root:
  - `role="button"`
  - `tabIndex={0}`
  - Enter + Space keyboard activation
- Save button:
  - `aria-label` toggles between "Save campaign" and "Remove saved campaign"
- CTA button:
  - `aria-label` includes campaign title when possible (`View deal for <title>`)
- Image:
  - meaningful `alt` text from campaign title
- Focus:
  - preserve visible ring on card, save control, and CTA

## Integration Mapping (Current Screen)

- Current card render points:
  - `activeTab === 'opportunities'` virtualized card block
  - `activeTab === 'saved'` card grid block
- Shared helpers already available:
  - `condensedDeliverableChips`
  - `formatOpenUntil`
  - `campaignImageForCard`
  - `toggleSaveCampaign`

Recommended extraction target:

- `MVP/src/components/dashboard/cards/OpportunityExploreCard.tsx`
- `MVP/src/components/dashboard/cards/opportunityCardTokens.ts`
- Replace both inline card blocks with this component to remove duplication.

## Reference Usage Example

```tsx
<OpportunityExploreCard
  content={{
    id: String(campaign.id),
    title: String(campaign.name ?? 'Campaign'),
    brandName: String(campaign.brandDisplayName ?? brand?.name ?? 'Brand'),
    imageSrc: campaignImageForCard(campaign),
    imageAlt: String(campaign.name ?? 'Campaign'),
    chips: toOpportunityChips(condensedDeliverableChips(campaign)),
    deadline: { label: `Closes ${formatOpenUntil(campaign.endDate)}` },
    compensation: { display: String(campaign.budgetHint || campaign.budget || 'Compensation shared on detail') },
    ctaLabel: 'View Deal',
  }}
  state={{ isSaved, isWithdrawn }}
  callbacks={{
    onOpen: () => setSelectedCampaign(campaign),
    onToggleSave: () => toggleSaveCampaign(String(campaign.id)),
  }}
/>
```

## QA Checklist (Per Build)

- Same visual hierarchy in Explore and Saved lists.
- CTA + compensation bottom alignment is stable across variable chip counts.
- No card-internal spacing values outside the contract.
- Card remains readable and tappable at `375px` width.
- Focus ring visible on all interactive controls.
- Saved/unsaved icon state is clearly distinguishable.
