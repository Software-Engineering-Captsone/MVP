'use client';

import { motion } from 'framer-motion';

export type DashboardPageHeaderProps = {
  title: string;
  subtitle: string;
  className?: string;
  animate?: boolean;
  /** Full-width pages vs. narrow panels (e.g. message list column) */
  variant?: 'page' | 'panel';
};

function headerClassName(variant: 'page' | 'panel', className: string) {
  const base = 'dash-page-header';
  const panel = variant === 'panel' ? 'dash-page-header--panel' : '';
  return [base, panel, className].filter(Boolean).join(' ');
}

export function DashboardPageHeader({
  title,
  subtitle,
  className = '',
  animate = false,
  variant = 'page',
}: DashboardPageHeaderProps) {
  const merged = headerClassName(variant, className);

  const inner = (
    <>
      <div className="dash-page-header__mark" aria-hidden />
      <h1 className="dash-page-header__title">
        {title}
        <span className="dash-page-header__title-accent">.</span>
      </h1>
      <p className="dash-page-header__subtitle">{subtitle}</p>
    </>
  );

  if (animate) {
    return (
      <motion.div
        className={merged}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {inner}
      </motion.div>
    );
  }

  return <div className={merged}>{inner}</div>;
}
