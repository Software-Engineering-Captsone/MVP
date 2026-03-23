'use client';

import { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Check,
  Lightbulb, Shield, Zap, Calendar,
  Video, Image, FileText, MapPin,
  Globe, Lock, Users, SlidersHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ── Steps ──────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Package' },
  { id: 3, label: 'Sourcing' },
  { id: 4, label: 'Review' },
];

/* ── Stepper ────────────────────────────────────────────────── */
function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isFuture = currentStep < step.id;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-nilink-accent text-white'
                    : isCurrent
                      ? 'bg-nilink-accent text-white ring-4 ring-nilink-accent-soft'
                      : 'border border-gray-200 bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-bold uppercase tracking-wider ${
                  isCurrent ? 'text-nilink-ink' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-4 h-px w-16 ${isCompleted ? 'bg-nilink-accent' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Package Cards ──────────────────────────────────────────── */
const packages = [
  {
    id: 'grand-opening',
    name: 'Grand Opening Promo',
    subtitle: 'Optimized for high engagement.',
    priceLevel: '$$',
    tag: 'Most Popular',
    deliverables: ['1 Reel (Main Feed)', '2 Stories w/ Link'],
    platforms: ['Instagram', 'TikTok'],
  },
  {
    id: 'local-awareness',
    name: 'Local Awareness',
    subtitle: 'Optimized for high engagement.',
    priceLevel: '$',
    tag: null,
    deliverables: ['1 Static Post', '1 Story Mention'],
    platforms: ['Instagram'],
  },
  {
    id: 'reel-story',
    name: 'Reel + Story Bundle',
    subtitle: 'Optimized for high engagement.',
    priceLevel: '$$$',
    tag: null,
    deliverables: ['2 Reels (Collaborator)', '4 Stories (48h apart)'],
    platforms: ['Instagram', 'Facebook'],
  },
  {
    id: 'ugc-photo',
    name: 'UGC Photo Package',
    subtitle: 'Optimized for high engagement.',
    priceLevel: '$$',
    tag: null,
    deliverables: ['5 High-Res UGC Photos', '1 Testimonial Clip'],
    platforms: ['Rights Only'],
  },
];

/* ── Goal Options ───────────────────────────────────────────── */
const goals = ['Brand Awareness', 'Lead Gen', 'Sales', 'Engagement', 'Foot Traffic', 'UGC Focus'];

/* ── Main Component ─────────────────────────────────────────── */
interface Props {
  onClose: () => void;
  onLaunch: () => void;
}

export function CreateCampaignOverlay({ onClose, onLaunch }: Props) {
  const [step, setStep] = useState(1);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [goal, setGoal] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brief, setBrief] = useState('');

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const selectedPkg = packages.find(p => p.id === selectedPackage);

  const [acceptApplications, setAcceptApplications] = useState(true);
  const [visibility, setVisibility] = useState<'Public' | 'Private'>('Public');
  const [sport, setSport] = useState('All Major Sports');
  const [gender, setGender] = useState('Any');
  const [followerMin, setFollowerMin] = useState(50);
  const [locationRadius, setLocationRadius] = useState('');

  const canProceed = () => {
    switch (step) {
      case 1: return campaignName.length > 0;
      case 2: return selectedPackage !== null;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleLaunch = () => {
    onLaunch();
  };

  const handleSaveDraft = () => {
    onClose();
  };

  // ── Step title/subtitle ──
  const stepInfo: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Create Campaign', subtitle: 'Define the core objectives for your NIL activation.' },
    2: { title: 'Choose Package', subtitle: 'Select a template that fits your campaign deliverables.' },
    3: { title: 'Sourcing Setup', subtitle: 'Define how athletes find and join your campaign.' },
    4: { title: 'Review & Launch', subtitle: 'Final check of your parameters before opening sourcing.' },
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-[1100px] max-w-[95vw] h-[800px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2
              className="text-2xl font-black uppercase tracking-wide"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {stepInfo[step].title}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">{stepInfo[step].subtitle}</p>
          </div>

          {/* Stepper */}
          <Stepper currentStep={step} />

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto bg-[#FAFAFA]">
          <div className={`${step === 1 || step === 2 ? '' : 'max-w-5xl mx-auto'} px-8 py-8`}>
            {/* ──────────────────── STEP 1: BASICS ──────────────────── */}
            {step === 1 && (
              <div className="flex">
                {/* Centered form area */}
                <div className="flex-1 flex justify-center">
                  <div className="w-full max-w-[640px] bg-white border border-gray-100 rounded-2xl p-8">
                    <div className="space-y-7">
                      {/* Campaign Name — full width */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                          Campaign Name
                        </label>
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="e.g. Summer Kickoff 2024"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300"
                        />
                      </div>

                      {/* Goal */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                          Campaign Goal
                        </label>
                        <select
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-700 appearance-none bg-white font-medium"
                        >
                          <option value="">Select a goal</option>
                          {goals.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      {/* Budget Range — own row */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                          Budget Range
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                            <input
                              type="text"
                              value={budgetMin}
                              onChange={(e) => setBudgetMin(e.target.value)}
                              placeholder="5,000"
                              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300"
                            />
                          </div>
                          <span className="text-gray-300 font-medium">–</span>
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                            <input
                              type="text"
                              value={budgetMax}
                              onChange={(e) => setBudgetMax(e.target.value)}
                              placeholder="10,000"
                              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Duration — own row with native date pickers */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                          Campaign Duration
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Start Date</p>
                            <div className="relative">
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-700 appearance-none bg-white [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">End Date</p>
                            <div className="relative">
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-700 appearance-none bg-white [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Brief */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                          Short Brief
                        </label>
                        <textarea
                          value={brief}
                          onChange={(e) => setBrief(e.target.value)}
                          placeholder="Describe the core message, key talking points, and brand guidelines athletes should follow..."
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300 resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Rail — Goal Guidance */}
                <div className="w-72 shrink-0 pl-6 border-l border-gray-100">
                  <div className="sticky top-0 rounded-2xl bg-nilink-ink p-6 text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-nilink-accent-bright" />
                      <h3 className="font-bold text-sm">Goal Guidance</h3>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-5">
                      Choosing the right goal helps our AI suggest athletes who excel in those specific engagement areas.
                    </p>
                    <div className="space-y-4">
                      {[
                        { name: 'Awareness', desc: 'Maximum reach and impressions.' },
                        { name: 'Foot Traffic', desc: 'Physical store visits via geofencing.' },
                        { name: 'UGC Focus', desc: 'High-quality content for reuse.' },
                      ].map(item => (
                        <div key={item.name}>
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[11px] text-gray-500 leading-snug">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────── STEP 2: PACKAGE ─────────────────── */}
            {step === 2 && (
              <div className="flex">
                {/* Centered package grid */}
                <div className="flex-1 flex justify-center">
                  <div className="w-full max-w-[640px]">
                  <div className="grid grid-cols-2 gap-4">
                    {packages.map(pkg => {
                      const isSelected = selectedPackage === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg.id)}
                          className={`rounded-2xl border-2 p-6 text-left transition-all ${
                            isSelected
                              ? 'border-nilink-accent bg-white shadow-lg'
                              : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              {pkg.tag && (
                                <span className="mb-2 inline-block rounded-full border border-nilink-accent-border bg-nilink-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-nilink-accent">
                                  {pkg.tag}
                                </span>
                              )}
                              {isSelected && (
                                <span className="mb-2 inline-block rounded-full bg-nilink-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                  Selected
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-400">{pkg.priceLevel}</span>
                          </div>
                          <h3 className="mb-1 text-lg font-bold text-nilink-ink">{pkg.name}</h3>
                          <p className="text-xs text-gray-400 mb-4">{pkg.subtitle}</p>
                          <div className="space-y-2 mb-4">
                            {pkg.deliverables.map((d, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-3.5 h-3.5 text-nilink-accent-bright shrink-0" />
                                {d}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                            {pkg.platforms.join(' · ')}
                          </p>
                        </button>
                      );
                    })}
                    </div>
                  </div>
                </div>

                {/* Right Rail — Compliance Summary */}
                <div className="w-72 shrink-0 pl-6 border-l border-gray-100">
                  <div className="sticky top-0 rounded-2xl bg-nilink-ink p-6 text-white">
                    <h3 className="font-bold text-sm mb-5">Compliance Summary</h3>
                    <div className="space-y-4">
                      {[
                        { icon: Shield, label: 'Organic Social Only', desc: 'Limited to athlete channels.' },
                        { icon: Calendar, label: '30-day usage', desc: 'Whitelisting rights included.' },
                        { icon: Zap, label: 'NIL Compliant', desc: 'Automated filing with portals.' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <item.icon className="w-4 h-4 text-nilink-accent-bright mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-white">{item.label}</p>
                            <p className="text-[11px] text-gray-500 leading-snug">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedPkg && (
                      <div className="mt-6 pt-5 border-t border-gray-700">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Est. Budget</p>
                        <p className="text-2xl font-black text-white">
                          {selectedPkg.priceLevel === '$' && '$1,200 – $2,400'}
                          {selectedPkg.priceLevel === '$$' && '$2,400 – $4,500'}
                          {selectedPkg.priceLevel === '$$$' && '$4,500 – $8,000'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────── STEP 3: SOURCING ────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Top cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Accept Applications */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Zap className="w-6 h-6 text-nilink-accent-bright" />
                      <button
                        onClick={() => setAcceptApplications(!acceptApplications)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          acceptApplications ? 'bg-nilink-accent' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            acceptApplications ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <h3 className="mb-1 text-base font-bold text-nilink-ink">Accept Applications</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Allow athletes to discover and apply to your campaign directly via the marketplace.
                    </p>
                  </div>

                  {/* Visibility */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <div className="flex items-start gap-2 mb-3">
                      {visibility === 'Public' ? (
                        <Globe className="w-6 h-6 text-nilink-accent-bright" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <h3 className="mb-3 text-base font-bold text-nilink-ink">Visibility Settings</h3>
                    <div className="flex gap-2">
                      {(['Public', 'Private'] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setVisibility(v)}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${
                            visibility === v
                              ? 'border border-nilink-accent bg-nilink-accent text-white'
                              : 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Athlete Filters */}
                <div className="bg-white border border-gray-100 rounded-2xl p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <SlidersHorizontal className="h-5 w-5 text-nilink-ink" />
                    <h3 className="text-base font-bold text-nilink-ink">Target Athlete Filters</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Preferred Sport
                      </label>
                      <select
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-700 appearance-none bg-white"
                      >
                        <option>All Major Sports</option>
                        <option>Basketball</option>
                        <option>Football</option>
                        <option>Baseball</option>
                        <option>Soccer</option>
                        <option>Track & Field</option>
                        <option>Volleyball</option>
                        <option>Gymnastics</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Gender Identity
                      </label>
                      <div className="flex gap-2">
                        {['Any', 'Men', 'Women'].map(g => (
                          <button
                            key={g}
                            onClick={() => setGender(g)}
                            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${
                              gender === g
                                ? 'border border-nilink-accent bg-nilink-accent text-white'
                                : 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Follower Range (Min)
                      </label>
                      <div className="px-1">
                        <input
                          type="range"
                          min={1}
                          max={100}
                          value={followerMin}
                          onChange={(e) => setFollowerMin(Number(e.target.value))}
                          className="w-full accent-[#2A90B0]"
                        />
                        <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                          <span>1K</span>
                          <span className="font-bold text-nilink-accent">
                            {followerMin >= 100 ? '1M+' : followerMin >= 50 ? `${followerMin}K+` : `${followerMin}K+`}
                          </span>
                          <span>1M</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Location Radius
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={locationRadius}
                          onChange={(e) => setLocationRadius(e.target.value)}
                          placeholder="Enter City or University"
                          className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-300"
                        />
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────── STEP 4: REVIEW ──────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Goal & Timeline */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <button
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-gray-400 hover:text-nilink-ink transition-colors uppercase tracking-wider"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Goal & Timeline
                    </p>
                    <div className="space-y-3 mt-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Goal</p>
                        <p className="text-sm font-bold text-nilink-ink">{goal || 'Brand Awareness'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duration</p>
                          <p className="text-sm font-bold text-nilink-ink">
                            {startDate && endDate ? `${startDate} – ${endDate}` : 'Apr 15 – May 30'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Budget</p>
                          <p className="text-sm font-bold text-nilink-accent-bright">
                            {budgetMin && budgetMax ? `${budgetMin} – ${budgetMax}` : '$5,000 – $10,000'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Package Structure */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <button
                        onClick={() => setStep(2)}
                        className="text-xs font-bold text-gray-400 hover:text-nilink-ink transition-colors uppercase tracking-wider"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Package Structure
                    </p>
                    <div className="space-y-2">
                      {(selectedPkg?.deliverables || ['2 Reels / TikTok Posts', '5 High-Res Still Assets']).map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Video className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {d}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-sm text-gray-400 italic">
                        <Image className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        Full Digital Usage (12 Months)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance & Readiness */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5" />
                    Compliance & Readiness
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-nilink-ink">Mandatory Fields Complete</p>
                        <p className="text-xs text-gray-400">All deliverables and terms are validated.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-nilink-ink">Disclosure Requirements Set</p>
                        <p className="text-xs text-gray-400">FTC #Ad mandates are active.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Action Bar ── */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-8 py-4">
          {step < 4 ? (
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  step === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-colors ${
                  canProceed()
                    ? 'bg-nilink-accent text-white hover:bg-nilink-accent-hover'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400'
                }`}
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Review step — special bottom bar */
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div>
                <p className="text-sm font-bold text-nilink-ink">Final Step</p>
                <p className="text-xs text-gray-400">Launch to begin the athlete sourcing phase.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  onClick={handleLaunch}
                  className="flex items-center gap-2 rounded-lg bg-nilink-accent px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-nilink-accent-hover"
                >
                  <Zap className="w-4 h-4" />
                  Launch & Open Sourcing
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
