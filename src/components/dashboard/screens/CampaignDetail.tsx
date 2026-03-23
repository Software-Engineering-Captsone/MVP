'use client';

import { useState } from 'react';
import {
  ChevronLeft, Edit3, Calendar, DollarSign, MapPin,
  Users, Eye, Target, Package, Globe, Lock,
  Check, Clock, AlertCircle, Send, MoreHorizontal,
  FileText, Video, Image, ArrowRight, TrendingUp,
  CheckCircle, XCircle, UserPlus, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Campaign, CampaignStatus, CandidateStatus, Candidate, ContractedAthlete, Deliverable, ActivityItem } from './BusinessCampaigns';

/* ── Status Badge (shared) ──────────────────────────────────── */
const campaignStatusStyles: Record<CampaignStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-500 border-gray-200',
  'Ready to Launch': 'bg-blue-50 text-blue-600 border-blue-200',
  'Open for Applications': 'bg-[#EFFAFC] text-[#2A90B0] border-[#B4E2ED]',
  'Reviewing Candidates': 'bg-amber-50 text-amber-600 border-amber-200',
  'Deal Creation in Progress': 'bg-purple-50 text-purple-600 border-purple-200',
  'Active': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Completed': 'bg-gray-100 text-gray-600 border-gray-300',
};

const candidateStatusStyles: Record<CandidateStatus, string> = {
  'Recommended': 'bg-blue-50 text-blue-600 border-blue-200',
  'Invited': 'bg-purple-50 text-purple-600 border-purple-200',
  'Applied': 'bg-[#EFFAFC] text-[#2A90B0] border-[#B4E2ED]',
  'Shortlisted': 'bg-amber-50 text-amber-600 border-amber-200',
  'Selected': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Sent to Deals': 'bg-purple-50 text-purple-700 border-purple-300',
  'Contracted': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Declined': 'bg-red-50 text-red-500 border-red-200',
};

const deliverableStatusStyles: Record<string, string> = {
  'Pending': 'bg-gray-100 text-gray-500 border-gray-200',
  'In Progress': 'bg-blue-50 text-blue-600 border-blue-200',
  'Submitted': 'bg-amber-50 text-amber-600 border-amber-200',
  'Approved': 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

/* ── Tab Definitions ────────────────────────────────────────── */
type TabId = 'overview' | 'candidates' | 'athletes' | 'deliverables' | 'activity';

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'athletes', label: 'Athletes' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'activity', label: 'Activity' },
];

/* ── Main Component ─────────────────────────────────────────── */
interface Props {
  campaign: Campaign;
  onBack: () => void;
}

export function CampaignDetail({ campaign, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  const toggleCandidate = (id: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCandidates.size === campaign.candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(campaign.candidates.map(c => c.id)));
    }
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
        className="relative w-[1100px] max-w-[95vw] h-[800px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden text-[#1C1C1E]"
      >
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1
                    className="text-3xl font-black uppercase tracking-wide"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {campaign.name}
                  </h1>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${campaignStatusStyles[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{campaign.subtitle} · {campaign.goal}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
                Edit Campaign
              </button>
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
      <div className="flex items-center gap-6 border-b border-gray-100 px-6 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm font-medium py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#1C1C1E] text-[#1C1C1E]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'candidates' && campaign.candidates.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full">
                {campaign.candidates.length}
              </span>
            )}
            {tab.id === 'athletes' && campaign.athletes.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full">
                {campaign.athletes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-auto">
        {/* ════════════════════ OVERVIEW ════════════════════ */}
        {activeTab === 'overview' && (
          <div className="px-6 py-6 max-w-5xl">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: Users, label: 'Candidates', value: campaign.candidateCount, color: 'text-[#2A90B0]' },
                { icon: Target, label: 'Athletes', value: campaign.athleteCount, color: 'text-emerald-600' },
                { icon: Eye, label: 'Applications', value: campaign.candidates.filter(c => c.status === 'Applied').length, color: 'text-amber-600' },
                { icon: TrendingUp, label: 'Deliverables', value: campaign.deliverables.length, color: 'text-purple-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-gray-400" />
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  </div>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Campaign Info */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Campaign Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Goal</p>
                      <p className="text-sm font-bold text-[#1C1C1E]">{campaign.goal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Duration</p>
                      <p className="text-sm font-bold text-[#1C1C1E]">{campaign.startDate} – {campaign.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Budget</p>
                      <p className="text-sm font-bold text-[#6CC3DA]">{campaign.budget}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Location</p>
                      <p className="text-sm font-bold text-[#1C1C1E]">{campaign.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package & Sourcing */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Package & Sourcing</h3>
                <div className="mb-4">
                  <p className="text-sm font-bold text-[#1C1C1E] mb-2">{campaign.packageName}</p>
                  <div className="space-y-1.5">
                    {campaign.packageDetails.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-[#6CC3DA] shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    {campaign.visibility === 'Public' ? (
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="font-medium">{campaign.visibility} Campaign</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">
                      {campaign.acceptApplications ? 'Accepting Applications' : 'Invite Only'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Brief */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Campaign Brief</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{campaign.brief}</p>
            </div>
          </div>
        )}

        {/* ════════════════════ CANDIDATES ════════════════════ */}
        {activeTab === 'candidates' && (
          <div className="flex flex-col h-full">
            {/* Candidates Actions */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCandidates.size === campaign.candidates.length && campaign.candidates.length > 0}
                    readOnly
                    className="rounded border-gray-300 accent-[#1C1C1E]"
                  />
                  Select All
                </button>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-0.5">
                  {['All', 'Applied', 'Shortlisted', 'Selected'].map(f => (
                    <button
                      key={f}
                      className="px-3 py-1 text-xs font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-white"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCandidates.size > 0 && (
                <button className="flex items-center gap-2 px-5 py-2 bg-[#1C1C1E] text-white rounded-lg text-sm font-bold hover:bg-[#2D2D2F] transition-colors">
                  <Send className="w-3.5 h-3.5" />
                  Send Selected to Deals ({selectedCandidates.size})
                </button>
              )}
            </div>

            {/* Candidates Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              {campaign.candidates.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 rounded-l-xl w-10"></th>
                      <th className="px-5 py-3">Athlete</th>
                      <th className="px-5 py-3">Sport</th>
                      <th className="px-5 py-3">Followers</th>
                      <th className="px-5 py-3">Engagement</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Applied</th>
                      <th className="px-5 py-3 rounded-r-xl w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.candidates.map((candidate) => (
                      <tr
                        key={candidate.id}
                        className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(candidate.id)}
                            onChange={() => toggleCandidate(candidate.id)}
                            className="rounded border-gray-300 accent-[#1C1C1E]"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={candidate.image}
                              alt={candidate.name}
                              className="w-8 h-8 rounded-full object-cover bg-gray-100"
                            />
                            <div>
                              <p className="font-bold text-gray-900">{candidate.name}</p>
                              <p className="text-xs text-gray-400">{candidate.school}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{candidate.sport}</td>
                        <td className="px-5 py-4 font-medium text-gray-900">{candidate.followers}</td>
                        <td className="px-5 py-4 font-medium text-gray-900">{candidate.engagement}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${candidateStatusStyles[candidate.status]}`}>
                            {candidate.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{candidate.appliedDate}</td>
                        <td className="px-5 py-4">
                          <button className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-gray-900 font-bold mb-1">No candidates yet</p>
                  <p className="text-sm text-gray-400 max-w-md">
                    Candidates will appear here once your campaign is launched and athletes begin applying or are invited.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ ATHLETES ════════════════════ */}
        {activeTab === 'athletes' && (
          <div className="px-6 py-6">
            {campaign.athletes.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {campaign.athletes.map(athlete => (
                  <div
                    key={athlete.id}
                    className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={athlete.image}
                        alt={athlete.name}
                        className="w-10 h-10 rounded-full object-cover bg-gray-100"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{athlete.name}</p>
                        <p className="text-xs text-gray-400">{athlete.sport} · {athlete.school}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contract Value</p>
                        <p className="text-lg font-black text-[#1C1C1E]">{athlete.contractValue}</p>
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Contracted
                      </span>
                    </div>

                    {/* Deliverable Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deliverables</p>
                        <p className="text-xs font-bold text-gray-600">{athlete.deliverablesCompleted}/{athlete.deliverablesTotal}</p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-[#6CC3DA] transition-all"
                          style={{
                            width: `${athlete.deliverablesTotal > 0 ? (athlete.deliverablesCompleted / athlete.deliverablesTotal) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <UserPlus className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold mb-1">No contracted athletes</p>
                <p className="text-sm text-gray-400 max-w-md">
                  Athletes will appear here once candidates complete the deal process and are contracted to this campaign.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ DELIVERABLES ════════════════════ */}
        {activeTab === 'deliverables' && (
          <div className="px-6 py-6">
            {campaign.deliverables.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 rounded-l-xl">Type</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Assigned To</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 rounded-r-xl w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.deliverables.map(deliverable => (
                    <tr
                      key={deliverable.id}
                      className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {deliverable.type.includes('Reel') || deliverable.type.includes('Video') || deliverable.type.includes('TikTok') ? (
                            <Video className="w-4 h-4 text-gray-400" />
                          ) : deliverable.type.includes('Story') ? (
                            <FileText className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Image className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-bold text-gray-900">{deliverable.type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 max-w-xs truncate">{deliverable.description}</td>
                      <td className="px-5 py-4">
                        {deliverable.assignedAthlete ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={deliverable.assignedAthleteImage || ''}
                              alt={deliverable.assignedAthlete}
                              className="w-6 h-6 rounded-full object-cover bg-gray-100"
                            />
                            <span className="text-sm font-medium text-gray-900">{deliverable.assignedAthlete}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{deliverable.dueDate}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${deliverableStatusStyles[deliverable.status]}`}>
                          {deliverable.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold mb-1">No deliverables yet</p>
                <p className="text-sm text-gray-400 max-w-md">
                  Deliverables will be tracked here once athletes are contracted and assigned content tasks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ ACTIVITY ════════════════════ */}
        {activeTab === 'activity' && (
          <div className="px-6 py-6 max-w-3xl">
            {campaign.activity.length > 0 ? (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-6 bottom-6 w-px bg-gray-100" />

                <div className="space-y-0">
                  {campaign.activity.map((item, idx) => {
                    const getIcon = () => {
                      switch (item.type) {
                        case 'status_change': return <ArrowRight className="w-3.5 h-3.5" />;
                        case 'candidate_action': return <Users className="w-3.5 h-3.5" />;
                        case 'deliverable': return <FileText className="w-3.5 h-3.5" />;
                        case 'system': return <Zap className="w-3.5 h-3.5" />;
                      }
                    };

                    const getIconColor = () => {
                      switch (item.type) {
                        case 'status_change': return 'bg-emerald-100 text-emerald-600';
                        case 'candidate_action': return 'bg-blue-50 text-blue-600';
                        case 'deliverable': return 'bg-purple-50 text-purple-600';
                        case 'system': return 'bg-gray-100 text-gray-500';
                      }
                    };

                    return (
                      <div key={item.id} className="flex items-start gap-4 py-4 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${getIconColor()}`}>
                          {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold mb-1">No activity yet</p>
                <p className="text-sm text-gray-400">Activity events will be logged here as your campaign progresses.</p>
              </div>
            )}
          </div>
        )}
      </div>
      </motion.div>
    </div>
  );
}
