/**
 * Tailwind token map for Explore opportunity cards — source of truth:
 * MVP/docs/explore-opportunity-card.contract.md
 *
 * Internal vertical ladder (px, 8pt grid):
 *   media gap 12 → title→brand 8 → brand→chips 12 (when chips present)
 *   → chips→deadline 12  OR  brand→deadline 12 (when chips hidden)
 *   → flex grow (auto) → deadline→bottom 12 (mt-auto + pt-3 on bottomShell).
 * Chip gap: 6px (gap-1.5) per contract.
 *
 * Sparse natural content (1-line title, no chips, no price): ≈ 166px.
 * Floor (`min-h`) is set just above that — see `root` comment below.
 */
export const opportunityCardTokens = {
  root: [
    'group rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
    // Floor sized just above the sparsest natural content (~166px) with a small comfort margin,
    // not the rich case. Rich cards naturally extend the row; sparse cards now sit close to
    // their natural height instead of carrying ~30–120px of dead air below the deadline.
    // 8pt grid: 176 = 8×22, mobile 160 = 8×20.
    'min-h-[176px] md:min-h-[176px] min-[0px]:min-h-[160px]',
    'transition-[box-shadow,border-color,transform,background-color] duration-200 ease-out',
    'hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
    'active:translate-y-0 active:shadow-sm motion-reduce:hover:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2',
  ].join(' '),

  /** gap-3 = 12px between media and text column */
  layoutRow: 'flex items-stretch gap-3',
  mediaWrap: 'h-[88px] w-[88px] shrink-0 self-start overflow-hidden rounded-2xl border border-gray-100 bg-gray-50',
  mediaImage:
    'h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100',
  /** Monogram fallback when no real image: deterministic gradient + initials, replaces the orange placeholder pattern. */
  mediaMonogram:
    'flex h-full w-full items-center justify-center text-2xl font-bold tracking-tight text-white transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100',

  headerWrap: 'min-w-0 flex-1',
  /** No min-height: avoids dead zone under short titles; save aligns top with title block */
  headerRow: 'flex items-start justify-between gap-3',
  title: 'line-clamp-2 text-xl font-bold leading-snug tracking-tight text-gray-900 sm:text-[22px] sm:leading-[1.08]',
  /** 8px below title — stronger secondary than body, still subordinate to price */
  brand: 'mt-2 truncate text-[13px] font-semibold leading-snug text-gray-700',

  saveButtonBase: 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out',
  saveButtonSaved: 'border-blue-200/90 bg-blue-50 text-blue-600',
  /** Default state: text-gray-500 (not 400) so the heart reads as a real affordance on cards with sparse content. */
  saveButtonDefault: 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700',
  saveIcon: 'h-4 w-4',

  /** 12px below header block; max 1 wrap row ≈ 2 lines chips via max-h + overflow hidden */
  chipsRow: 'mt-3 flex max-h-[52px] flex-wrap items-center gap-1.5 overflow-hidden',
  /** Primary deliverable chips */
  chip: 'inline-flex max-w-full items-center truncate rounded-md border border-gray-200/80 bg-gray-50 px-2 py-1 text-[11px] font-medium leading-none text-gray-700',
  /** Muted overflow / secondary lane */
  chipMuted: 'inline-flex max-w-full items-center truncate rounded-md border border-dashed border-gray-200 bg-white px-2 py-1 text-[11px] font-medium leading-none text-gray-500',

  /** 12px below chips; deadline slightly more prominent */
  deadlineRow: 'mt-3 flex min-h-0 items-center justify-between gap-2 text-[13px] font-medium text-gray-700',
  deadlineLabel: 'inline-flex min-w-0 items-center gap-2',
  deadlineDotNormal: 'h-2 w-2 shrink-0 rounded-full bg-amber-400',
  deadlineDotSoon: 'h-2 w-2 shrink-0 rounded-full bg-orange-500',
  deadlineDotToday: 'h-2 w-2 shrink-0 rounded-full bg-red-500',
  /**
   * Indicator for ongoing/no-close campaigns. Soft emerald (not gray) so the dot reads as "live / active",
   * not "data missing" — pairs with copy like "Open ongoing".
   */
  deadlineDotNone: 'h-2 w-2 shrink-0 rounded-full bg-emerald-500/80',
  /** Tone the row down when there is no real deadline so it reads as a hint, not data. */
  deadlineRowMuted: 'mt-3 flex min-h-0 items-center justify-between gap-2 text-[13px] font-medium text-gray-500',
  withdrawnTag:
    'shrink-0 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800',

  /** pt-3 = 12px above compensation row after flex grow */
  bottomShell: 'mt-auto flex w-full min-w-0 flex-col pt-3',
  /** items-center keeps CTA visually centered against the comp slot whether the slot is a single-line price or a 2-line note. */
  bottomRow: 'flex w-full min-w-0 items-center justify-between gap-3 sm:gap-4',
  /** Used when the compensation slot is hidden (no real price). CTA right-aligns alone. */
  bottomRowCtaOnly: 'flex w-full min-w-0 items-center justify-end gap-3 sm:gap-4',
  /** flex-1 + min-w-0: use space left of CTA so ranges like $1,200-$2,000 stay one line when possible; avoid break-words (awkward splits). */
  compensation:
    'min-w-0 flex-1 text-2xl font-bold leading-none tracking-tight text-gray-900 tabular-nums break-normal sm:text-[28px]',
  /**
   * Note variant for descriptive fallbacks ("Comp on offer", "Pay on application", etc.).
   * `truncate` (not `line-clamp-2`) guarantees a single-line baseline so the CTA on the
   * right always aligns to one predictable midline — wrapping is handled upstream by
   * choosing short labels, not by letting the layout decide.
   */
  compensationNote:
    'min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-gray-500',
  cta: 'inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#4F93E6] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3D83D9]',
} as const;

/** Shared focus ring for nested controls (matches contract root ring token). */
export const opportunityCardFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2';

/**
 * Deterministic gradient palette for monogram fallbacks.
 * Index is chosen by hashing the brand name, so the same brand consistently gets the same tone
 * across cards while the grid as a whole feels varied (vs. the previous "six identical orange placeholders" pattern).
 */
export const opportunityMonogramTones = [
  'bg-gradient-to-br from-orange-400 to-amber-500',
  'bg-gradient-to-br from-blue-500 to-indigo-500',
  'bg-gradient-to-br from-emerald-500 to-teal-500',
  'bg-gradient-to-br from-fuchsia-500 to-pink-500',
  'bg-gradient-to-br from-violet-500 to-purple-500',
  'bg-gradient-to-br from-rose-500 to-red-500',
] as const;

/**
 * Brands directory cards — same surface / motion / focus discipline as opportunity cards,
 * without duplicating opportunity-specific layout tokens.
 */
export const brandDirectoryCardTokens = {
  root: [
    'group flex min-h-[248px] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
    'transition-[box-shadow,border-color,transform,background-color] duration-200 ease-out',
    'hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
    'active:translate-y-0 active:shadow-sm motion-reduce:hover:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2',
  ].join(' '),
  bannerWrap: 'aspect-[16/9] shrink-0 overflow-hidden bg-gray-50',
  bannerImage:
    'h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100',
  /** 16px padding; body grows so meta can sit above bottom for rhythm with opportunity cards */
  body: 'flex flex-1 flex-col p-4',
  title: 'line-clamp-2 text-xl font-bold leading-snug tracking-tight text-gray-900 sm:text-[22px] sm:leading-[1.08]',
  /** 8px then 12px ladder: title → meta → spacer */
  meta: 'mt-2 text-[13px] font-semibold leading-snug text-gray-700',
  metaSpacer: 'mt-auto pt-3',
  metaHint: 'text-xs font-medium text-gray-500',
} as const;
