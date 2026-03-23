'use client';

import { useState } from 'react';
import {
  Plus, Search, Filter, ArrowUpRight, TrendingUp, Users, Eye, Edit3, XCircle,
  ChevronRight, Calendar, Video, FileText, Image as ImageIcon, Zap, Package
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { CreateCampaignOverlay } from './CreateCampaignOverlay';
import { CampaignDetail } from './CampaignDetail';

/* ── Types ──────────────────────────────────────────────────── */
export type CampaignStatus =
  | 'Draft'
  | 'Ready to Launch'
  | 'Open for Applications'
  | 'Reviewing Candidates'
  | 'Deal Creation in Progress'
  | 'Active'
  | 'Completed';

export type CandidateStatus =
  | 'Recommended' | 'Invited' | 'Applied' | 'Shortlisted'
  | 'Selected' | 'Sent to Deals' | 'Contracted' | 'Declined';

export interface Deliverable {
  id: string;
  type: string;
  description: string;
  assignedAthlete: string | null;
  assignedAthleteImage: string | null;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Submitted' | 'Approved';
}

export interface Candidate {
  id: string;
  name: string;
  sport: string;
  school: string;
  image: string;
  followers: string;
  engagement: string;
  status: CandidateStatus;
  appliedDate: string;
}

export interface ContractedAthlete {
  id: string;
  name: string;
  sport: string;
  school: string;
  image: string;
  contractValue: string;
  deliverablesCompleted: number;
  deliverablesTotal: number;
}

export interface ActivityItem {
  id: string;
  type: 'status_change' | 'candidate_action' | 'deliverable' | 'system';
  description: string;
  timestamp: string;
  icon?: string;
}

export interface Campaign {
  id: string;
  name: string;
  subtitle: string;
  packageName: string;
  goal: string;
  status: CampaignStatus;
  budget: string;
  duration: string;
  location: string;
  brief: string;
  athleteCount: number;
  candidateCount: number;
  image: string;
  startDate: string;
  endDate: string;
  visibility: 'Public' | 'Private';
  acceptApplications: boolean;
  sport: string;
  packageDetails: string[];
  platforms: string[];
  deliverables: Deliverable[];
  candidates: Candidate[];
  athletes: ContractedAthlete[];
  activity: ActivityItem[];
}

/* ── Mock Data ──────────────────────────────────────────────── */
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Rush 2024',
    subtitle: 'Social Media Blast',
    packageName: 'Reel + Story Bundle',
    goal: 'Brand Awareness',
    status: 'Active',
    budget: '$5,000 – $10,000',
    duration: '6 weeks',
    location: 'San Francisco HQ',
    brief: 'Maximize reach through coordinated social media content across Instagram and TikTok, featuring product integrations with our new summer energy drink lineup.',
    athleteCount: 12,
    candidateCount: 24,
    image: '/athletes_images/Athlete1.jpg',
    startDate: 'Apr 15, 2026',
    endDate: 'May 30, 2026',
    visibility: 'Public',
    acceptApplications: true,
    sport: 'All Sports',
    packageDetails: ['2 Reels (Collaborator)', '4 Stories (48h apart)'],
    platforms: ['Instagram', 'Facebook'],
    deliverables: [
      { id: 'd1', type: 'Instagram Reel', description: 'Product showcase reel with brand mention', assignedAthlete: 'Emalee Frost', assignedAthleteImage: '/athletes_images/Athlete5.jpeg', dueDate: 'May 1, 2026', status: 'In Progress' },
      { id: 'd2', type: 'Story Set (x4)', description: '4 stories showing daily routine with product', assignedAthlete: 'Kyson Brown', assignedAthleteImage: '/athletes_images/Athlete6.jpg', dueDate: 'May 5, 2026', status: 'Pending' },
      { id: 'd3', type: 'TikTok Video', description: 'Trend-aligned product unboxing', assignedAthlete: 'Emalee Frost', assignedAthleteImage: '/athletes_images/Athlete5.jpeg', dueDate: 'May 15, 2026', status: 'Pending' },
      { id: 'd4', type: 'Instagram Reel', description: 'Behind-the-scenes training with product', assignedAthlete: 'Aaliyah Turner', assignedAthleteImage: '/athletes_images/Athlete11.jpg', dueDate: 'May 20, 2026', status: 'Submitted' },
    ],
    candidates: [
      { id: 'c1', name: 'Mia Galella', sport: 'Softball', school: 'Boston College', image: '/athletes_images/Athlete14.jpg', followers: '14.2K', engagement: '6.1%', status: 'Applied', appliedDate: 'Mar 18' },
      { id: 'c2', name: 'Dante Holloway', sport: 'Track & Field', school: 'Oregon Ducks', image: '/athletes_images/Athlete12.jpg', followers: '18.9K', engagement: '7.3%', status: 'Shortlisted', appliedDate: 'Mar 15' },
      { id: 'c3', name: 'Sienna Brooks', sport: 'Gymnastics', school: 'UCLA Bruins', image: '/athletes_images/Athlete8.jpg', followers: '88.2K', engagement: '11.2%', status: 'Recommended', appliedDate: 'Mar 20' },
      { id: 'c4', name: 'Jordan Austin', sport: 'Baseball', school: 'Missouri Western', image: '/athletes_images/Athlete4.jpg', followers: '8.5K', engagement: '5.8%', status: 'Invited', appliedDate: 'Mar 12' },
      { id: 'c5', name: 'Jaxon Steele', sport: 'Wrestling', school: 'Penn State', image: '/athletes_images/Athlete16.jpeg', followers: '12.4K', engagement: '4.9%', status: 'Selected', appliedDate: 'Mar 10' },
      { id: 'c6', name: 'Malik Jefferson', sport: 'Football', school: 'Alabama', image: '/athletes_images/Athlete10.jpg', followers: '102K', engagement: '9.1%', status: 'Sent to Deals', appliedDate: 'Mar 8' },
    ],
    athletes: [
      { id: 'a1', name: 'Emalee Frost', sport: "Women's Volleyball", school: 'Hofstra Pride', image: '/athletes_images/Athlete5.jpeg', contractValue: '$2,500', deliverablesCompleted: 1, deliverablesTotal: 3 },
      { id: 'a2', name: 'Kyson Brown', sport: 'Football', school: 'Arizona State', image: '/athletes_images/Athlete6.jpg', contractValue: '$3,000', deliverablesCompleted: 0, deliverablesTotal: 2 },
      { id: 'a3', name: 'Aaliyah Turner', sport: 'Basketball', school: 'Texas Athletics', image: '/athletes_images/Athlete11.jpg', contractValue: '$4,500', deliverablesCompleted: 1, deliverablesTotal: 2 },
    ],
    activity: [
      { id: 'act1', type: 'deliverable', description: 'Emalee Frost submitted Instagram Reel for review', timestamp: '2 hours ago' },
      { id: 'act2', type: 'candidate_action', description: 'Malik Jefferson moved to Sent to Deals', timestamp: '5 hours ago' },
      { id: 'act3', type: 'candidate_action', description: 'Mia Galella applied to this campaign', timestamp: '1 day ago' },
      { id: 'act4', type: 'candidate_action', description: 'Sienna Brooks recommended by AI matching', timestamp: '1 day ago' },
      { id: 'act5', type: 'status_change', description: 'Campaign status changed to Active', timestamp: '3 days ago' },
      { id: 'act6', type: 'system', description: 'Campaign launched and opened for sourcing', timestamp: '5 days ago' },
      { id: 'act7', type: 'system', description: 'Campaign created as draft', timestamp: '1 week ago' },
    ],
  },
  {
    id: '2',
    name: 'Pro League Partnership',
    subtitle: 'Event Appearance',
    packageName: 'Local Awareness',
    goal: 'Lead Gen',
    status: 'Deal Creation in Progress',
    budget: '$15,000 – $25,000',
    duration: '3 months',
    location: 'Austin, TX',
    brief: 'Event-based activation seeking athletes for in-person appearances and social media coverage.',
    athleteCount: 1,
    candidateCount: 8,
    image: '/athletes_images/Athlete6.jpg',
    startDate: 'May 1, 2026',
    endDate: 'Jul 31, 2026',
    visibility: 'Private',
    acceptApplications: false,
    sport: 'Basketball',
    packageDetails: ['1 Static Post', '1 Story Mention'],
    platforms: ['Instagram'],
    deliverables: [],
    candidates: [
      { id: 'c10', name: 'Kyson Brown', sport: 'Football', school: 'Arizona State', image: '/athletes_images/Athlete6.jpg', followers: '25.6K', engagement: '8.4%', status: 'Selected', appliedDate: 'Apr 1' },
    ],
    athletes: [
      { id: 'a10', name: 'Malik Jefferson', sport: 'Football', school: 'Alabama', image: '/athletes_images/Athlete10.jpg', contractValue: '$8,000', deliverablesCompleted: 0, deliverablesTotal: 4 },
    ],
    activity: [
      { id: 'act10', type: 'candidate_action', description: 'Kyson Brown selected for deals', timestamp: '1 day ago' },
      { id: 'act11', type: 'system', description: 'Campaign entered deal creation phase', timestamp: '2 days ago' },
    ],
  },
  {
    id: '3',
    name: 'Winter Apparel Drop',
    subtitle: 'Influencer Kit',
    packageName: 'UGC Photo Package',
    goal: 'Sales',
    status: 'Reviewing Candidates',
    budget: '$8,000 – $12,000',
    duration: '4 weeks',
    location: 'New York, NY',
    brief: 'UGC-focused campaign for winter apparel line launch, seeking photogenic athletes for product photography.',
    athleteCount: 0,
    candidateCount: 15,
    image: '/athletes_images/Athlete8.jpg',
    startDate: 'Jun 1, 2026',
    endDate: 'Jun 30, 2026',
    visibility: 'Public',
    acceptApplications: true,
    sport: 'All Sports',
    packageDetails: ['5 High-Res UGC Photos', '1 Testimonial Clip'],
    platforms: ['Instagram'],
    deliverables: [],
    candidates: [
      { id: 'c20', name: 'Sienna Brooks', sport: 'Gymnastics', school: 'UCLA', image: '/athletes_images/Athlete8.jpg', followers: '88.2K', engagement: '11.2%', status: 'Shortlisted', appliedDate: 'May 5' },
      { id: 'c21', name: 'Mia Galella', sport: 'Softball', school: 'Boston College', image: '/athletes_images/Athlete14.jpg', followers: '14.2K', engagement: '6.1%', status: 'Applied', appliedDate: 'May 8' },
    ],
    athletes: [],
    activity: [
      { id: 'act20', type: 'candidate_action', description: 'Sienna Brooks shortlisted', timestamp: '3 hours ago' },
      { id: 'act21', type: 'system', description: 'Campaign opened for applications', timestamp: '2 days ago' },
    ],
  },
  {
    id: '4',
    name: 'Campus Tour 24',
    subtitle: 'On-Campus Promo',
    packageName: 'Grand Opening Promo',
    goal: 'Engagement',
    status: 'Open for Applications',
    budget: '$3,000 – $6,000',
    duration: '2 weeks',
    location: 'Dallas, TX',
    brief: 'On-campus activation at select universities — seeking athletes to represent the brand at student events.',
    athleteCount: 0,
    candidateCount: 3,
    image: '/athletes_images/Athlete12.jpg',
    startDate: 'Jul 1, 2026',
    endDate: 'Jul 14, 2026',
    visibility: 'Public',
    acceptApplications: true,
    sport: 'Football',
    packageDetails: ['1 Reel (Main Feed)', '2 Stories w/ Link'],
    platforms: ['Instagram', 'TikTok'],
    deliverables: [],
    candidates: [
      { id: 'c30', name: 'Dante Holloway', sport: 'Track & Field', school: 'Oregon', image: '/athletes_images/Athlete12.jpg', followers: '18.9K', engagement: '7.3%', status: 'Applied', appliedDate: 'Jun 20' },
    ],
    athletes: [],
    activity: [
      { id: 'act30', type: 'system', description: 'Campaign launched and opened for sourcing', timestamp: '1 day ago' },
    ],
  },
  {
    id: '5',
    name: 'Spring Training Series',
    subtitle: 'Performance Content',
    packageName: 'Reel + Story Bundle',
    goal: 'Brand Awareness',
    status: 'Draft',
    budget: '$10,000 – $18,000',
    duration: '8 weeks',
    location: 'Phoenix, AZ',
    brief: 'Pre-season training content campaign featuring workout routines and nutrition partnerships.',
    athleteCount: 0,
    candidateCount: 0,
    image: '/athletes_images/Athlete4.jpg',
    startDate: 'TBD',
    endDate: 'TBD',
    visibility: 'Private',
    acceptApplications: false,
    sport: 'All Sports',
    packageDetails: ['2 Reels (Collaborator)', '4 Stories (48h apart)'],
    platforms: ['Instagram', 'Facebook'],
    deliverables: [],
    candidates: [],
    athletes: [],
    activity: [
      { id: 'act50', type: 'system', description: 'Campaign created as draft', timestamp: '3 days ago' },
    ],
  },
  {
    id: '6',
    name: 'Holiday Gift Guide',
    subtitle: 'Seasonal Push',
    packageName: 'Grand Opening Promo',
    goal: 'Sales',
    status: 'Completed',
    budget: '$20,000 – $30,000',
    duration: '6 weeks',
    location: 'Chicago, IL',
    brief: 'Holiday gift guide activation with top athletes — unboxing, reviews, and curated product lists.',
    athleteCount: 8,
    candidateCount: 32,
    image: '/athletes_images/Athlete11.jpg',
    startDate: 'Nov 15, 2025',
    endDate: 'Dec 31, 2025',
    visibility: 'Public',
    acceptApplications: true,
    sport: 'All Sports',
    packageDetails: ['1 Reel (Main Feed)', '2 Stories w/ Link'],
    platforms: ['Instagram', 'TikTok'],
    deliverables: [
      { id: 'd60', type: 'Holiday Reel', description: 'Gift guide reel', assignedAthlete: 'Aaliyah Turner', assignedAthleteImage: '/athletes_images/Athlete11.jpg', dueDate: 'Dec 1, 2025', status: 'Approved' },
      { id: 'd61', type: 'Unboxing TikTok', description: 'Product unboxing', assignedAthlete: 'Sienna Brooks', assignedAthleteImage: '/athletes_images/Athlete8.jpg', dueDate: 'Dec 10, 2025', status: 'Approved' },
    ],
    candidates: [],
    athletes: [
      { id: 'a60', name: 'Aaliyah Turner', sport: 'Basketball', school: 'Texas Athletics', image: '/athletes_images/Athlete11.jpg', contractValue: '$4,500', deliverablesCompleted: 3, deliverablesTotal: 3 },
    ],
    activity: [
      { id: 'act60', type: 'status_change', description: 'Campaign marked as Completed', timestamp: 'Jan 5, 2026' },
    ],
  },
  {
    id: '7',
    name: 'Back to School Promo',
    subtitle: 'Student Activation',
    packageName: 'Local Awareness',
    goal: 'Foot Traffic',
    status: 'Active',
    budget: '$7,000 – $12,000',
    duration: '4 weeks',
    location: 'Los Angeles, CA',
    brief: 'Drive in-store foot traffic at university bookstores through athlete endorsements and geo-targeted content.',
    athleteCount: 5,
    candidateCount: 12,
    image: '/athletes_images/Athlete16.jpeg',
    startDate: 'Aug 15, 2026',
    endDate: 'Sep 15, 2026',
    visibility: 'Public',
    acceptApplications: true,
    sport: 'All Sports',
    packageDetails: ['1 Static Post', '1 Story Mention'],
    platforms: ['Instagram'],
    deliverables: [
      { id: 'd70', type: 'Store Visit Story', description: 'In-store product showcase story', assignedAthlete: 'Jaxon Steele', assignedAthleteImage: '/athletes_images/Athlete16.jpeg', dueDate: 'Sep 1, 2026', status: 'In Progress' },
    ],
    candidates: [
      { id: 'c70', name: 'Jordan Austin', sport: 'Baseball', school: 'Missouri Western', image: '/athletes_images/Athlete4.jpg', followers: '8.5K', engagement: '5.8%', status: 'Applied', appliedDate: 'Aug 10' },
    ],
    athletes: [
      { id: 'a70', name: 'Jaxon Steele', sport: 'Wrestling', school: 'Penn State', image: '/athletes_images/Athlete16.jpeg', contractValue: '$1,500', deliverablesCompleted: 0, deliverablesTotal: 2 },
    ],
    activity: [
      { id: 'act70', type: 'deliverable', description: 'Jaxon Steele started working on Store Visit Story', timestamp: '6 hours ago' },
    ],
  },
];

/* ── Status Badge ───────────────────────────────────────────── */
const statusStyles: Record<CampaignStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-500 border-gray-200',
  'Ready to Launch': 'bg-blue-50 text-blue-600 border-blue-200',
  'Open for Applications': 'bg-[#EFFAFC] text-[#2A90B0] border-[#B4E2ED]',
  'Reviewing Candidates': 'bg-amber-50 text-amber-600 border-amber-200',
  'Deal Creation in Progress': 'bg-purple-50 text-purple-600 border-purple-200',
  'Active': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Completed': 'bg-gray-100 text-gray-600 border-gray-300',
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

/* ── Avatar Group ───────────────────────────────────────────── */
function AvatarGroup({ athletes, count }: { athletes: ContractedAthlete[]; count: number }) {
  const shown = athletes.slice(0, 3);
  const remaining = count - shown.length;

  if (count === 0) {
    return <span className="text-xs text-gray-400 font-medium">—</span>;
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((a) => (
          <img
            key={a.id}
            src={a.image}
            alt={a.name}
            className="w-7 h-7 rounded-full border-2 border-white object-cover"
          />
        ))}
      </div>
      {remaining > 0 && (
        <span className="ml-1.5 text-xs font-bold text-gray-400">+{remaining}</span>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export function BusinessCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [campaigns] = useState<Campaign[]>(mockCampaigns);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const activeCampaigns = campaigns.filter(c => c.status === 'Active');
  const openCampaigns = campaigns.filter(c => c.status === 'Open for Applications');
  const reviewingCampaigns = campaigns.filter(c => c.status === 'Reviewing Candidates' || c.status === 'Deal Creation in Progress');
  const completedCampaigns = campaigns.filter(c => c.status === 'Completed');

  // Filters
  const filteredCampaigns = campaigns.filter(c => {
    if (activeFilter === 'Active' && c.status !== 'Active') return false;
    if (activeFilter === 'Completed' && c.status !== 'Completed') return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCampaignCreated = () => {
    setShowCreateOverlay(false);
  };

  return (
    <>
      {/* ── Campaigns Home (list view) ── */}
      {!selectedCampaign && (
        <div className="h-full flex flex-col bg-white overflow-hidden text-[#1C1C1E]">
        {/* ── Search & Filter Bar ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowCreateOverlay(true)}
            className="px-5 py-2 bg-[#1C1C1E] text-white rounded-lg text-sm font-semibold hover:bg-[#2D2D2F] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>

        {/* ── Title + Stats ── */}
        <div className="px-6 py-6 shrink-0">
          <h1
            className="text-4xl font-black tracking-wide uppercase mb-6"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Campaigns
          </h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active', value: activeCampaigns.length, color: 'text-emerald-600' },
              { label: 'Open for Apps', value: openCampaigns.length, color: 'text-[#2A90B0]' },
              { label: 'Reviewing', value: reviewingCampaigns.length, color: 'text-amber-600' },
              { label: 'Completed', value: completedCampaigns.length, color: 'text-gray-500' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>
                  {String(stat.value).padStart(2, '0')}
                </p>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            {['All', 'Active', 'Completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                  activeFilter === tab
                    ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="flex-1" />
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </div>

        {/* ── Campaign Table ── */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-bold text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 rounded-l-xl">Name</th>
                <th className="px-5 py-3">Goal</th>
                <th className="px-5 py-3">Athletes</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 rounded-r-xl w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                  className="group hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={campaign.image}
                        alt={campaign.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                      />
                      <div>
                        <p className="font-bold text-gray-900">{campaign.name}</p>
                        <p className="text-xs text-gray-400">{campaign.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 font-medium">{campaign.goal}</td>
                  <td className="px-5 py-4">
                    <AvatarGroup athletes={campaign.athletes} count={campaign.athleteCount} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCampaigns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Eye className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold mb-1">No campaigns found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters or create a new campaign.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedCampaign && (
          <CampaignDetail
            key="campaign-detail"
            campaign={selectedCampaign}
            onBack={() => setSelectedCampaign(null)}
          />
        )}
        
        {showCreateOverlay && (
          <CreateCampaignOverlay
            key="create-campaign"
            onClose={() => setShowCreateOverlay(false)}
            onLaunch={handleCampaignCreated}
          />
        )}
      </AnimatePresence>
    </>
  );
}
