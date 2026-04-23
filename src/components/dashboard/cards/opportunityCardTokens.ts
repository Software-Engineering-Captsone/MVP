/**
 * Tailwind token map for Explore opportunity cards — source of truth:
 * MVP/docs/explore-opportunity-card.contract.md
 *
 * Internal vertical ladder (px, 8pt grid): media gap 12 → title→brand 8 → brand block→chips 12 →
 * chips→deadline 12 → flex grow (auto) → deadline block→bottom 12 (via mt-auto + pt-3 on bottom shell).
 * Chip gap: 6px (gap-1.5) per contract.
 */
export const opportunityCardTokens = {
  root: [
    'group rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
    'min-h-[248px] md:min-h-[248px] min-[0px]:min-h-[220px]',
    'transition-[box-shadow,border-color,transform,background-color] duration-200 ease-out',
    'hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
    'active:translate-y-0 active:shadow-sm motion-reduce:hover:translate-y-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2',
  ].join(' '),

  /** gap-3 = 12px between media and text column */
  layoutRow: 'flex items-stretch gap-3',
  mediaWrap: 'h-[88px] w-[88px] shrink-0 self-start overflow-hidden rounded-2xl border border-gray-100 bg-gray-50',
  mediaImage: 'h-full w-full object-cover',

  headerWrap: 'min-w-0 flex-1',
  /** No min-height: avoids dead zone under short titles; save aligns top with title block */
  headerRow: 'flex items-start justify-between gap-3',
  title: 'line-clamp-2 text-xl font-bold leading-snug tracking-tight text-gray-900 sm:text-[22px] sm:leading-[1.08]',
  /** 8px below title — stronger secondary than body, still subordinate to price */
  brand: 'mt-2 truncate text-[13px] font-semibold leading-snug text-gray-700',

  saveButtonBase: 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
  saveButtonSaved: 'border-blue-200/90 bg-blue-50 text-blue-600',
  saveButtonDefault: 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600',
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
  withdrawnTag:
    'shrink-0 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800',

  /** pt-3 = 12px above compensation row after flex grow */
  bottomShell: 'mt-auto flex w-full min-w-0 flex-col pt-3',
  bottomRow: 'flex w-full min-w-0 items-end justify-between gap-3 sm:gap-4',
  /** flex-1 + min-w-0: use space left of CTA so ranges like $1,200-$2,000 stay one line when possible; avoid break-words (awkward splits). */
  compensation:
    'min-w-0 flex-1 text-2xl font-bold leading-none tracking-tight text-gray-900 tabular-nums break-normal sm:text-[28px]',
  cta: 'inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#4F93E6] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3D83D9]',
} as const;

/** Shared focus ring for nested controls (matches contract root ring token). */
export const opportunityCardFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nilink-accent/30 focus-visible:ring-offset-2';

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
