import Link from 'next/link';

/** Gradient “N” mark — matches landing `.nav-logo-mark` (dark surfaces). */
export function NilinkLogoMark({
  surface = 'dark',
  className = '',
}: {
  surface?: 'dark' | 'light';
  className?: string;
}) {
  const base =
    'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] text-sm font-bold tracking-[-0.04em] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.15)]';
  const dark =
    'border border-white/15 text-white [background:linear-gradient(135deg,#6cc3da,#2a90b0)]';
  const light =
    'border border-transparent text-white [background:linear-gradient(135deg,#6cc3da,#2a90b0)]';
  return (
    <span className={`${base} ${surface === 'light' ? light : dark} ${className}`} aria-hidden>
      N
    </span>
  );
}

/** Wordmark — matches landing `.nav-logo-text` sizing. */
export function NilinkLogoText({
  surface = 'dark',
  collapsible = false,
  className = '',
}: {
  surface?: 'dark' | 'light';
  collapsible?: boolean;
  className?: string;
}) {
  const color =
    surface === 'light' ? 'text-[color:var(--text)]' : 'text-white';
  const collapse = collapsible
    ? 'max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[200px] group-hover:opacity-100 whitespace-nowrap'
    : '';
  return (
    <span
      className={`text-lg font-bold tracking-[-0.04em] leading-none ${color} ${collapse} ${className}`}
    >
      NILINK
    </span>
  );
}

/**
 * Full logo link for marketing surfaces (navbar, footer, auth).
 * Pass the same layout class you used before (`nav-logo`, `auth-left-logo`, etc.).
 */
export function NilinkLogoLink({
  href = '/',
  className = '',
  surface = 'dark',
}: {
  href?: string;
  className?: string;
  surface?: 'dark' | 'light';
}) {
  return (
    <Link href={href} className={className}>
      <NilinkLogoMark surface={surface} />
      <NilinkLogoText surface={surface} />
    </Link>
  );
}
