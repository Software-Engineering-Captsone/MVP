'use client';

import type { KeyboardEvent } from 'react';
import { Heart } from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import {
  opportunityCardFocusRing,
  opportunityCardTokens,
} from '@/components/dashboard/cards/opportunityCardTokens';

export type OpportunityCardChipLane = 'deliverable' | 'qualifier';

export type OpportunityCardChip = {
  id: string;
  label: string;
  lane: OpportunityCardChipLane;
  title?: string;
};

export type OpportunityCardCompensation = {
  display: string;
  ariaLabel?: string;
};

export type OpportunityCardDeadline = {
  label: string;
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
  chips: OpportunityCardChip[];
  deadline: OpportunityCardDeadline;
  compensation: OpportunityCardCompensation;
  ctaLabel?: string;
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
  focusRingClassName?: string;
  interactiveSurfaceClassName?: string;
};

export function toOpportunityChips(labels: readonly string[]): OpportunityCardChip[] {
  return labels.map((label, idx) => ({
    id: `deliverable-${idx}-${label}`,
    label,
    lane: 'deliverable' as const,
    title: label,
  }));
}

function deadlineDotClass(urgency?: OpportunityCardDeadline['urgency']): string {
  if (urgency === 'today') return opportunityCardTokens.deadlineDotToday;
  if (urgency === 'soon') return opportunityCardTokens.deadlineDotSoon;
  return opportunityCardTokens.deadlineDotNormal;
}

function visibleChips(chips: OpportunityCardChip[]): OpportunityCardChip[] {
  if (chips.length <= 3) return chips;
  const overflow = chips.length - 2;
  return [
    chips[0]!,
    chips[1]!,
    { id: `${chips[0]!.id}-overflow`, label: `+${overflow} more`, lane: 'deliverable' as const },
  ];
}

export function OpportunityExploreCard({
  content,
  state,
  callbacks,
  className = '',
  focusRingClassName = opportunityCardFocusRing,
  interactiveSurfaceClassName = '',
}: OpportunityCardProps) {
  const focusRing = focusRingClassName;
  const ctaLabel = content.ctaLabel ?? 'View Deal';
  const saveAria = state.isSaved ? 'Remove saved campaign' : 'Save campaign';

  const rootClassName = [
    opportunityCardTokens.root,
    interactiveSurfaceClassName,
    state.isDisabled ? 'pointer-events-none opacity-60' : '',
    className,
  ]
    .join(' ')
    .trim();

  const onCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (state.isDisabled || state.isLoading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callbacks.onOpen();
    }
  };

  if (state.isLoading) {
    return (
      <div className={`${rootClassName} flex flex-col`} aria-busy aria-label="Loading opportunity">
        <OpportunityExploreCardSkeleton />
      </div>
    );
  }

  const chips = visibleChips(content.chips);

  return (
    <div
      role="button"
      tabIndex={state.isDisabled ? -1 : 0}
      className={`${rootClassName} flex flex-col`}
      onClick={() => {
        if (state.isDisabled) return;
        callbacks.onOpen();
      }}
      onKeyDown={onCardKeyDown}
    >
      {/* min-h on root + flex-1 column; bottomShell mt-auto + pt-3 locks compensation + CTA to card bottom. */}
      <div className={`${opportunityCardTokens.layoutRow} min-h-0 flex-1 motion-reduce:transition-none`}>
        <div className={opportunityCardTokens.mediaWrap}>
          <ImageWithFallback
            src={content.imageSrc}
            alt={content.imageAlt}
            className={opportunityCardTokens.mediaImage}
          />
        </div>
        <div className={`${opportunityCardTokens.headerWrap} flex min-h-0 flex-1 flex-col`}>
          <div className={opportunityCardTokens.headerRow}>
            <div className="min-w-0 pr-1">
              <h3 className={opportunityCardTokens.title}>{content.title}</h3>
              <p className={opportunityCardTokens.brand}>{content.brandName}</p>
            </div>
            <button
              type="button"
              aria-label={saveAria}
              disabled={state.isDisabled}
              className={[
                opportunityCardTokens.saveButtonBase,
                state.isSaved ? opportunityCardTokens.saveButtonSaved : opportunityCardTokens.saveButtonDefault,
                focusRing,
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation();
                if (state.isDisabled) return;
                callbacks.onToggleSave();
              }}
            >
              <Heart className={`${opportunityCardTokens.saveIcon} ${state.isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className={opportunityCardTokens.chipsRow}>
            {chips.map((chip) => {
              const isMuted = chip.label.startsWith('+') || chip.lane === 'qualifier';
              const chipClass = isMuted ? opportunityCardTokens.chipMuted : opportunityCardTokens.chip;
              return (
                <span key={chip.id} className={chipClass} title={chip.title ?? chip.label}>
                  {chip.label}
                </span>
              );
            })}
          </div>

          <div className={opportunityCardTokens.deadlineRow}>
            <span className={opportunityCardTokens.deadlineLabel}>
              <span className={deadlineDotClass(content.deadline.urgency)} aria-hidden />
              <span className="truncate">{content.deadline.label}</span>
            </span>
            {state.isWithdrawn ? (
              <span className={opportunityCardTokens.withdrawnTag}>Withdrawn</span>
            ) : null}
          </div>

          <div className={opportunityCardTokens.bottomShell}>
            <div className={opportunityCardTokens.bottomRow}>
              <p
                className={opportunityCardTokens.compensation}
                {...(content.compensation.ariaLabel ? { 'aria-label': content.compensation.ariaLabel } : {})}
              >
                {content.compensation.display}
              </p>
              <button
                type="button"
                aria-label={`View deal for ${content.title}`}
                disabled={state.isDisabled}
                className={[opportunityCardTokens.cta, focusRing].join(' ')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (state.isDisabled) return;
                  callbacks.onOpen();
                }}
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Contract skeleton: fixed geometry matching card composition. */
export function OpportunityExploreCardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse flex-col">
      <div className={`${opportunityCardTokens.layoutRow} min-h-0 flex-1`}>
        <div className={opportunityCardTokens.mediaWrap}>
          <div className="h-full w-full bg-gray-200" />
        </div>
        <div className={`${opportunityCardTokens.headerWrap} flex min-h-0 flex-1 flex-col`}>
          <div className={opportunityCardTokens.headerRow}>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 w-full max-w-[220px] rounded bg-gray-200" />
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
            <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
          </div>
          <div className={opportunityCardTokens.chipsRow}>
            <div className="h-5 w-20 rounded-md border border-gray-100 bg-gray-100" />
            <div className="h-5 w-16 rounded-md border border-gray-100 bg-gray-100" />
          </div>
          <div className={opportunityCardTokens.deadlineRow}>
            <div className="h-3.5 w-28 rounded bg-gray-100" />
            <span className="sr-only">Loading</span>
          </div>
          <div className={opportunityCardTokens.bottomShell}>
            <div className={opportunityCardTokens.bottomRow}>
              <div className="h-8 w-24 rounded bg-gray-200" />
              <div className="h-10 w-[104px] shrink-0 rounded-xl bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Standalone loading tile for grids (e.g. infinite scroll) — matches opportunity card shell + skeleton. */
export function OpportunityExploreCardPlaceholder() {
  return (
    <div
      className={`${opportunityCardTokens.root} pointer-events-none flex flex-col`}
      aria-busy
      aria-label="Loading opportunity"
    >
      <OpportunityExploreCardSkeleton />
    </div>
  );
}
