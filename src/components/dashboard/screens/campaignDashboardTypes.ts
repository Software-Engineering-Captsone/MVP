export type CampaignStatus =
  | 'Draft'
  | 'Ready to Launch'
  | 'Open for Applications'
  | 'Reviewing Candidates'
  | 'Deal Creation in Progress'
  | 'Active'
  | 'Completed';

export type CandidateStatus =
  | 'Recommended'
  | 'Invited'
  | 'Applied'
  | 'Shortlisted'
  | 'Selected'
  | 'Sent to Deals'
  | 'Contracted'
  | 'Declined';

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
