'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { OnboardingAthletic, SportEntry } from '@/hooks/useOnboardingStorage';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-nilink-ink outline-none transition placeholder:text-gray-400 focus:border-nilink-accent-border focus:ring-2 focus:ring-nilink-accent/20';
const labelClass =
  'mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400';

const SPORTS = [
  'Basketball', 'Football', 'Baseball', 'Soccer', 'Volleyball',
  'Track & Field', 'Swimming', 'Tennis', 'Softball', 'Wrestling',
  'Lacrosse', 'Golf', 'Hockey', 'Gymnastics', 'Rowing',
  'Cheerleading', 'Dance', 'Other',
] as const;

let _idCounter = Date.now();
function makeId() { return String(++_idCounter); }

/* ── Sport preview card ──────────────────────────────────── */
function SportCard({ entry, onEdit, onDelete }: { entry: SportEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm transition hover:border-nilink-accent-border"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{entry.sport}</p>
        {entry.position && <p className="mt-0.5 text-xs text-gray-500">{entry.position}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-nilink-accent" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500" title="Remove">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Sport entry form ────────────────────────────────────── */
function SportForm({ initial, onSave, onCancel }: { initial?: SportEntry; onSave: (sport: string, position: string) => void; onCancel: () => void }) {
  const [sport, setSport] = useState(initial?.sport ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const canSave = sport.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="rounded-2xl border-2 border-nilink-accent-border bg-nilink-accent-soft/30 p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="sport-entry-sport">Sport</label>
          <select id="sport-entry-sport" value={sport} onChange={(e) => setSport(e.target.value)} className={`${inputClass} appearance-none`}>
            <option value="">Select sport</option>
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="sport-entry-position">Position <span className="text-gray-300">(optional)</span></label>
          <input id="sport-entry-position" type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={inputClass} placeholder="e.g. Point Guard, Wide Receiver" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <motion.button type="button" disabled={!canSave} onClick={() => onSave(sport, position)} className="inline-flex items-center gap-1.5 rounded-lg bg-nilink-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40" whileTap={canSave ? { scale: 0.97 } : {}}>
          <Check className="h-3.5 w-3.5" /> {initial ? 'Update' : 'Add Sport'}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main Step 2 ──────────────────────────────────────────── */
interface Step2Props {
  data: OnboardingAthletic;
  onChange: (patch: Partial<OnboardingAthletic>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Athletic({ data, onChange, onNext, onBack }: Step2Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasSports = data.sports.length > 0;
  const filled = hasSports;

  const handleAdd = (sport: string, position: string) => {
    const entry: SportEntry = { id: makeId(), sport, position };
    onChange({ sports: [...data.sports, entry] });
    setShowForm(false);
  };

  const handleUpdate = (sport: string, position: string) => {
    if (!editingId) return;
    onChange({ sports: data.sports.map((s) => s.id === editingId ? { ...s, sport, position } : s) });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange({ sports: data.sports.filter((s) => s.id !== id) });
    if (editingId === id) setEditingId(null);
  };

  const editingEntry = editingId ? data.sports.find((s) => s.id === editingId) : undefined;

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }} className="space-y-6">
      {/* Helper text */}
      <p className="text-sm leading-relaxed text-gray-500">
        Add every sport you compete in. You&apos;ll provide your school and eligibility in the next step.
      </p>

      {/* Sport entries */}
      <div>
        <label className={labelClass}>Sports ({data.sports.length} added)</label>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {data.sports.map((entry) =>
              editingId === entry.id ? (
                <SportForm key={`edit-${entry.id}`} initial={editingEntry} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
              ) : (
                <SportCard key={entry.id} entry={entry} onEdit={() => { setEditingId(entry.id); setShowForm(false); }} onDelete={() => handleDelete(entry.id)} />
              ),
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showForm && (
            <div className="mt-2">
              <SportForm key="new" onSave={handleAdd} onCancel={() => setShowForm(false)} />
            </div>
          )}
        </AnimatePresence>

        {!showForm && editingId === null && (
          <motion.button type="button" onClick={() => setShowForm(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 shadow-sm transition hover:border-nilink-accent hover:bg-nilink-accent-soft/30 hover:text-nilink-accent" whileTap={{ scale: 0.98 }}>
            <Plus className="h-4 w-4" />
            {hasSports ? 'Add Another Sport' : 'Add Sport'}
          </motion.button>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <motion.button type="button" disabled={!filled} onClick={onNext} className="inline-flex items-center gap-2 rounded-2xl bg-nilink-accent px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:cursor-not-allowed disabled:opacity-40" whileHover={filled ? { scale: 1.02 } : {}} whileTap={filled ? { scale: 0.98 } : {}}>
          Continue <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
