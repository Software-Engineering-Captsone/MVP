'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, ArrowLeft, Search, Lock, Loader2 } from 'lucide-react';
import type { OnboardingAcademic } from '@/hooks/useOnboardingStorage';
import {
  useUniversities,
  useUniversitySearch,
  findUniversityByDomain,
  type University,
} from '@/hooks/useUniversities';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const lockedInputClass =
  'w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none cursor-not-allowed';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate / 5th Year'] as const;
const ELIGIBILITY = ['1 year', '2 years', '3 years', '4 years'] as const;

interface Step3Props {
  data: OnboardingAcademic;
  sessionEmail: string;
  onChange: (patch: Partial<OnboardingAcademic>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Academic({ data, sessionEmail, onChange, onNext, onBack }: Step3Props) {
  const { universities, loading: loadingUnis, error: uniError } = useUniversities();

  // Detect if account email is .edu
  const isEduAccount = sessionEmail.toLowerCase().endsWith('.edu');
  const accountDomain = isEduAccount ? sessionEmail.split('@')[1].toLowerCase() : '';

  // Auto-detect university from .edu email on first load
  const didAutoDetect = useRef(false);
  useEffect(() => {
    if (didAutoDetect.current || !isEduAccount || universities.length === 0) return;
    didAutoDetect.current = true;

    const match = findUniversityByDomain(universities, accountDomain);
    if (match && !data.school) {
      onChange({
        school: match.name,
        schoolDomain: accountDomain,
        schoolEmail: sessionEmail,
      });
    }
  }, [universities, isEduAccount, accountDomain, sessionEmail, data.school, onChange]);

  // ── University search (only if not .edu account) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchResults = useUniversitySearch(universities, searchQuery);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSelectUniversity = (uni: University) => {
    onChange({
      school: uni.name,
      schoolDomain: uni.domains[0] ?? '',
      schoolEmail: '', // Reset so they must enter a matching .edu email
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  // ── .edu email validation (for non-.edu accounts) ──
  const needsEduEmail = !isEduAccount && data.school.length > 0;
  const eduEmailValid =
    isEduAccount ||
    (data.schoolEmail.includes('@') &&
      data.schoolDomain &&
      data.schoolEmail.toLowerCase().endsWith(`@${data.schoolDomain}`));

  // ── Continue gate ──
  const filled =
    data.school.length > 0 &&
    data.currentYear.length > 0 &&
    (isEduAccount || eduEmailValid);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="mb-2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-nilink-accent-soft text-nilink-accent">
          <GraduationCap className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2
          className="text-2xl tracking-wide text-nilink-ink"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          UNIVERSITY & ACADEMICS
        </h2>
        <p className="mt-1 text-sm font-medium text-gray-500">
          {isEduAccount
            ? 'We detected your school from your .edu email. Confirm your details below.'
            : 'Search for your university and verify with your school email.'}
        </p>
      </div>

      {/* ── University selection ── */}
      <div>
        <label className={labelClass} htmlFor="ob-school">
          School / University
          {isEduAccount && <Lock className="ml-1.5 inline h-3 w-3 text-gray-300" />}
        </label>

        {isEduAccount ? (
          /* Locked — auto-detected from .edu */
          <>
            <div className="relative">
              <GraduationCap className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                id="ob-school"
                type="text"
                value={data.school || `Detected from ${accountDomain}`}
                readOnly
                className={`${lockedInputClass} pl-10`}
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              Auto-detected from your .edu account ({sessionEmail})
            </p>
          </>
        ) : (
          /* Searchable dropdown */
          <div ref={dropdownRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="ob-school"
                type="text"
                value={data.school ? data.school : searchQuery}
                onChange={(e) => {
                  if (data.school) {
                    // Clear the selection and start searching
                    onChange({ school: '', schoolDomain: '', schoolEmail: '' });
                    setSearchQuery(e.target.value);
                  } else {
                    setSearchQuery(e.target.value);
                  }
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  if (!data.school && searchQuery.length >= 2) setShowDropdown(true);
                }}
                className={`${inputClass} pl-10 pr-10`}
                placeholder="Search for your university…"
                autoComplete="off"
              />
              {loadingUnis && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && searchResults.length > 0 && !data.school && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {searchResults.map((uni) => (
                  <button
                    key={uni.name}
                    type="button"
                    onClick={() => handleSelectUniversity(uni)}
                    className="block w-full px-4 py-3 text-left text-sm transition hover:bg-nilink-accent-soft/40"
                  >
                    <span className="font-medium text-gray-900">{uni.name}</span>
                    {uni.domains[0] && (
                      <span className="ml-2 text-xs text-gray-400">{uni.domains[0]}</span>
                    )}
                    {uni['state-province'] && (
                      <span className="ml-1 text-xs text-gray-300">· {uni['state-province']}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {uniError && (
              <p className="mt-1 text-[10px] text-red-500">
                Could not load university list. You can type your school name manually.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── School email (for non-.edu accounts) ── */}
      {needsEduEmail && (
        <div>
          <label className={labelClass} htmlFor="ob-school-email">
            School Email (.edu)
          </label>
          <input
            id="ob-school-email"
            type="email"
            value={data.schoolEmail}
            onChange={(e) => onChange({ schoolEmail: e.target.value })}
            className={inputClass}
            placeholder={data.schoolDomain ? `you@${data.schoolDomain}` : 'you@school.edu'}
            autoComplete="email"
          />
          {data.schoolEmail.length > 0 && !eduEmailValid && (
            <p className="mt-1 text-[10px] text-amber-600">
              Email must end with @{data.schoolDomain}
            </p>
          )}
          {eduEmailValid && data.schoolEmail.length > 0 && (
            <p className="mt-1 text-[10px] text-emerald-600">✓ Matches university domain</p>
          )}
        </div>
      )}

      {/* ── Year + Eligibility ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="ob-year">
            Current Year
          </label>
          <select
            id="ob-year"
            value={data.currentYear}
            onChange={(e) => onChange({ currentYear: e.target.value })}
            className={`${inputClass} appearance-none`}
          >
            <option value="">Select year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="ob-elig-status">
            Eligibility Status
          </label>
          <select
            id="ob-elig-status"
            value={data.eligibilityStatus}
            onChange={(e) => onChange({ eligibilityStatus: e.target.value })}
            className={`${inputClass} appearance-none`}
          >
            <option value="">Select status</option>
            <option value="Active">Active</option>
            <option value="Redshirt">Redshirt</option>
            <option value="Medical Redshirt">Medical Redshirt</option>
            <option value="Transfer Portal">Transfer Portal</option>
            <option value="Walk-on">Walk-on</option>
          </select>
        </div>
      </div>

      {/* Remaining Eligibility */}
      <div>
        <label className={labelClass}>Remaining Eligibility</label>
        <div className="flex flex-wrap gap-2">
          {ELIGIBILITY.map((opt) => {
            const active = data.eligibilityYears === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ eligibilityYears: opt })}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-nilink-accent bg-nilink-accent text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <motion.button
          type="button"
          disabled={!filled}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-nilink-accent px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={filled ? { scale: 1.02 } : {}}
          whileTap={filled ? { scale: 0.98 } : {}}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
