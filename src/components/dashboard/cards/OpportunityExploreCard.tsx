'use client';

import type { KeyboardEvent } from 'react';
import { Heart } from 'lucide-react';
import { ImageWithFallback } from '@/components/dashboard/ImageWithFallback';
import {
  opportunityCardFocusRing,
  opportunityCardTokens,
  opportunityMonogramTones,
} from '@/components/dashboard/cards/opportunityCardTokens';

export type OpportunityCardChipLane = 'deliverable' | 'qualifier';

export type OpportunityCardChip = {
  id: string;
  label: string;
  lane: OpportunityCardChipLane;
  title?: string;
};

export type OpportunityCardCompensation = {
  /**
   * The string to render. **Pass an empty string to hide the slot entirely** —
   * preferred over filler copy like "Comp on offer" so the bottom row collapses
   * to just the CTA and the card stops carrying anti-information.
   */
  display: string;
  ariaLabel?: string;
  /**
   * Visual treatment for the compensation slot (only relevant when `display` is non-empty).
   * - 'price' — large bold typography for actual amounts ("$1,200", "$1k–$2k").
   * - 'note'  — small muted typography for short descriptive labels ("Pay on application").
   * When omitted, the variant is auto-detected: any digit or currency symbol => 'price', otherwise 'note'.
   */
  variant?: 'price' | 'note';
};

export type OpportunityCardDeadline = {
  label: string;
  /** 'none' renders a neutral gray dot (use when there is no real close date — e.g. ongoing campaigns). */
  urgency?: 'normal' | 'soon' | 'today' | 'none';
};

export type OpportunityCardVisualState = {
  isSaved: boolean;
  isWithdrawn?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
};

export type OpportunityCardMonogram = {
  /** 1–2 char initials. The card does not derive these — callers compute from brand name. */
  initials: string;
  /** Optional palette index into `opportunityMonogramTones`; if omitted, hashed from `initials`. */
  tone?: number;
};

export type OpportunityCardContent = {
  id: string;
  title: string;
  brandName: string;
  postedLabel?: string;
  endDateLabel?: string;
  categoryLabel?: string;
  /** Empty/falsy => render the monogram fallback. */
  imageSrc: string;
  imageAlt: string;
  /** Optional monogram fallback used when `imageSrc` is missing or empty. */
  mediaMonogram?: OpportunityCardMonogram;
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

/** Deterministic palette index — same input always picks the same gradient. */
function monogramToneClass(monogram: OpportunityCardMonogram): string {
  if (typeof monogram.tone === 'number') {
    return opportunityMonogramTones[monogram.tone % opportunityMonogramTones.length]!;
  }
  let hash = 0;
  for (let i = 0; i < monogram.initials.length; i += 1) {
    hash = (hash * 31 + monogram.initials.charCodeAt(i)) >>> 0;
  }
  return opportunityMonogramTones[hash % opportunityMonogramTones.length]!;
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
  const ctaLabel = content.ctaLabel ?? 'View Details';
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

  const postedLabel = content.postedLabel?.trim() || 'Posted recently';
  const endDateLabel = content.endDateLabel?.trim() || 'Open ongoing';
  const categoryLabel = content.categoryLabel?.trim() || 'General';

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
      <div className={`${opportunityCardTokens.layoutRow} min-h-0 flex-1 motion-reduce:transition-none`}>
        <div className={opportunityCardTokens.mediaWrap}>
          {content.imageSrc ? (
            <ImageWithFallback
              src={content.imageSrc}
              alt={content.imageAlt}
              className={opportunityCardTokens.mediaImage}
            />
          ) : content.mediaMonogram ? (
            <div
              className={`${opportunityCardTokens.mediaMonogram} ${monogramToneClass(content.mediaMonogram)}`}
              role="img"
              aria-label={content.imageAlt}
            >
              {content.mediaMonogram.initials}
            </div>
          ) : (
            <ImageWithFallback
              src={content.imageSrc}
              alt={content.imageAlt}
              className={opportunityCardTokens.mediaImage}
            />
          )}
        </div>
        <div className={`${opportunityCardTokens.headerWrap} flex min-h-0 flex-1 flex-col`}>
          <div className={opportunityCardTokens.headerRow}>
            <div className="min-w-0 pr-1">
              <h3 className={opportunityCardTokens.title}>{content.title}</h3>
              <div className={opportunityCardTokens.brandMetaRow}>
                <p className={opportunityCardTokens.brand}>{content.brandName}</p>
                <span className={opportunityCardTokens.postedDot} aria-hidden />
                <p className={opportunityCardTokens.postedLabel}>{postedLabel}</p>
              </div>
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
          <div className={opportunityCardTokens.divider} />
          <div className={opportunityCardTokens.infoRow}>
            <div className={opportunityCardTokens.infoItem}>
              <p className={opportunityCardTokens.infoLabel}>Ends On</p>
              <p className={opportunityCardTokens.infoValue}>{endDateLabel}</p>
            </div>
            <div className={opportunityCardTokens.infoDivider} aria-hidden />
            <div className={opportunityCardTokens.infoItem}>
              <p className={opportunityCardTokens.infoLabel}>Category</p>
              <p className={opportunityCardTokens.infoValue}>{categoryLabel}</p>
            </div>
            {state.isWithdrawn ? (
              <span className={`${opportunityCardTokens.withdrawnTag} ml-auto`}>Withdrawn</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className={opportunityCardTokens.bottomShell}>
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
              <div className="h-8 w-full max-w-[280px] rounded bg-gray-200" />
              <div className="h-4 w-48 rounded bg-gray-200" />
            </div>
            <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
          </div>
          <div className={opportunityCardTokens.divider} />
          <div className={opportunityCardTokens.infoRow}>
            <div className="w-full min-w-0 space-y-2">
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div className="h-5 w-24 rounded bg-gray-200" />
            </div>
            <div className="h-9 w-px shrink-0 bg-gray-100" />
            <div className="w-full min-w-0 space-y-2">
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div className="h-5 w-28 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
      <div className={opportunityCardTokens.bottomShell}>
        <div className="h-12 w-full rounded-xl bg-gray-200" />
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
