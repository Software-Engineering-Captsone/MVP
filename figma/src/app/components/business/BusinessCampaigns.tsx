import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Users, Eye, DollarSign, TrendingUp, X, Megaphone, Pause, Play, Edit3, Plus } from "lucide-react";

interface Campaign {
  id: number;
  title: string;
  sport: string;
  description: string;
  budget: number;
  budgetSpent: number;
  applicants: number;
  interestedAthletes: number;
  views: number;
  startDate: string;
  endDate: string;
  status: "Draft" | "Active" | "Paused" | "Completed";
  deliverables: string[];
  requirements: string[];
}

const ItemTypes = {
  CAMPAIGN: "campaign",
};

interface CampaignCardProps {
  campaign: Campaign;
  onMove: (campaignId: number, newStatus: Campaign["status"]) => void;
  onClick: (campaign: Campaign) => void;
}

function CampaignCard({ campaign, onMove, onClick }: CampaignCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CAMPAIGN,
    item: { id: campaign.id, currentStatus: campaign.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const budgetProgress = (campaign.budgetSpent / campaign.budget) * 100;

  return (
    <div
      ref={drag}
      onClick={() => onClick(campaign)}
      className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-bold text-black flex-1 pr-2">{campaign.title}</h4>
        
      </div>

      <p className="text-xs text-black mb-3 line-clamp-2">{campaign.description}</p>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-black">Budget</span>
          <span className="font-bold text-black">
            ${campaign.budgetSpent.toLocaleString()} / ${campaign.budget.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${Math.min(budgetProgress, 100)}%`,
              backgroundColor: budgetProgress > 90 ? "#EF4444" : "#6CC3DA",
            }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-black" />
          </div>
          <p className="font-bold text-black">{campaign.applicants}</p>
          <p className="text-black text-[10px]">Applicants</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-black" />
          </div>
          <p className="font-bold text-black">{campaign.interestedAthletes}</p>
          <p className="text-black text-[10px]">Interested</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye className="w-3 h-3 text-black" />
          </div>
          <p className="font-bold text-black">{campaign.views}</p>
          <p className="text-black text-[10px]">Views</p>
        </div>
      </div>
    </div>
  );
}

interface ColumnProps {
  title: string;
  status: Campaign["status"];
  campaigns: Campaign[];
  onDrop: (campaignId: number, newStatus: Campaign["status"]) => void;
  onCardClick: (campaign: Campaign) => void;
  count: number;
}

function Column({ title, status, campaigns, onDrop, onCardClick, count }: ColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.CAMPAIGN,
    drop: (item: { id: number; currentStatus: Campaign["status"] }) => {
      if (item.currentStatus !== status) {
        onDrop(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const getBadgeColor = () => {
    switch (status) {
      case "Draft":
        return "bg-gray-200";
      case "Active":
        return "bg-yellow-100";
      case "Paused":
        return "bg-red-100";
      case "Completed":
        return "bg-green-100";
      default:
        return "bg-white";
    }
  };

  return (
    <div
      ref={drop}
      className={`flex-1 bg-gray-50 rounded-lg p-4 ${isOver ? "ring-2 ring-[#6CC3DA]" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-xl font-bold tracking-tight text-black"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold text-black ${getBadgeColor()}`}>
          {count}
        </span>
      </div>
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} onMove={onDrop} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}

export function BusinessCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 1,
      title: "Spring Training Fuel Campaign",
      sport: "All Sports",
      description: "Looking for athletes to promote our new spring energy drink lineup during training season",
      budget: 15000,
      budgetSpent: 8500,
      applicants: 24,
      interestedAthletes: 42,
      views: 1250,
      startDate: "Mar 1, 2026",
      endDate: "May 31, 2026",
      status: "Active",
      deliverables: ["3 Instagram posts per month", "2 TikTok videos", "Product reviews"],
      requirements: ["10K+ followers", "Active social presence", "Engages with fitness content"],
    },
    {
      id: 2,
      title: "Basketball Season Sponsorship",
      sport: "Basketball",
      description: "Seeking basketball players for season-long partnership with exclusive product line",
      budget: 25000,
      budgetSpent: 17500,
      applicants: 18,
      interestedAthletes: 35,
      views: 890,
      startDate: "Feb 15, 2026",
      endDate: "May 15, 2026",
      status: "Active",
      deliverables: ["4 Instagram posts per month", "Weekly stories", "1 live session"],
      requirements: ["Division I or II basketball", "15K+ followers", "7%+ engagement rate"],
    },
    {
      id: 3,
      title: "Track & Field Partnership",
      sport: "Track & Field",
      description: "Partner with track athletes for summer training campaign featuring recovery products",
      budget: 10000,
      budgetSpent: 0,
      applicants: 31,
      interestedAthletes: 58,
      views: 1580,
      startDate: "Apr 1, 2026",
      endDate: "Jun 30, 2026",
      status: "Active",
      deliverables: ["2 Instagram posts per month", "Product demonstrations", "Training tips content"],
      requirements: ["Track & Field athlete", "Consistent posting schedule"],
    },
    {
      id: 4,
      title: "Summer Wellness Initiative",
      sport: "All Sports",
      description: "Draft campaign for summer wellness and hydration featuring multiple sports",
      budget: 20000,
      budgetSpent: 0,
      applicants: 0,
      interestedAthletes: 0,
      views: 0,
      startDate: "Jun 1, 2026",
      endDate: "Aug 31, 2026",
      status: "Draft",
      deliverables: ["TBD based on athlete input"],
      requirements: ["To be finalized"],
    },
    {
      id: 5,
      title: "Women's Soccer Showcase",
      sport: "Soccer",
      description: "Special campaign highlighting women's soccer with focus on athletic empowerment",
      budget: 12000,
      budgetSpent: 0,
      applicants: 8,
      interestedAthletes: 19,
      views: 420,
      startDate: "May 1, 2026",
      endDate: "Jul 31, 2026",
      status: "Paused",
      deliverables: ["3 Instagram posts", "2 Reels", "Behind-the-scenes content"],
      requirements: ["Women's soccer", "Authentic voice", "Community engagement"],
    },
    {
      id: 6,
      title: "Fall Training Campaign",
      sport: "Football",
      description: "Pre-season football campaign featuring new protein line for strength training",
      budget: 18000,
      budgetSpent: 18000,
      applicants: 15,
      interestedAthletes: 28,
      views: 1120,
      startDate: "Aug 1, 2025",
      endDate: "Oct 31, 2025",
      status: "Completed",
      deliverables: ["4 Instagram posts", "3 TikTok videos", "2 Blog features"],
      requirements: ["College football", "Training focused content"],
    },
    {
      id: 7,
      title: "Winter Sponsorship Series",
      sport: "All Sports",
      description: "Multi-sport winter campaign for indoor training and recovery products",
      budget: 22000,
      budgetSpent: 22000,
      applicants: 20,
      interestedAthletes: 45,
      views: 1680,
      startDate: "Dec 1, 2025",
      endDate: "Feb 28, 2026",
      status: "Completed",
      deliverables: ["Weekly social content", "Product reviews", "Training tips"],
      requirements: ["Active winter training", "Consistent engagement"],
    },
  ]);

  const handleDrop = (campaignId: number, newStatus: Campaign["status"]) => {
    setCampaigns((prevCampaigns) =>
      prevCampaigns.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, status: newStatus } : campaign
      )
    );
  };

  const draftCampaigns = campaigns.filter((c) => c.status === "Draft");
  const activeCampaigns = campaigns.filter((c) => c.status === "Active");
  const pausedCampaigns = campaigns.filter((c) => c.status === "Paused");
  const completedCampaigns = campaigns.filter((c) => c.status === "Completed");

  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalSpent = campaigns.reduce((sum, campaign) => sum + campaign.budgetSpent, 0);
  const totalApplicants = campaigns.reduce((sum, campaign) => sum + campaign.applicants, 0);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1
                  className="text-5xl mb-2 tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
                >
                  CAMPAIGNS
                </h1>
                <p className="text-gray-600">Manage your sponsorship opportunities and track performance</p>
              </div>
              <button
                className="px-6 py-3 rounded-lg font-bold text-black hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: "#6CC3DA" }}
              >
                <Plus className="w-5 h-5" />
                CREATE CAMPAIGN
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Total Campaigns</p>
                <p className="text-3xl font-bold text-black">
                  {campaigns.length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Active Campaigns</p>
                <p className="text-3xl font-bold text-black">
                  {activeCampaigns.length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Total Budget</p>
                <p className="text-3xl font-bold text-black">
                  ${totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Total Applicants</p>
                <p className="text-3xl font-bold text-black">
                  {totalApplicants}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-4 gap-6 h-full">
              <Column
                title="DRAFT"
                status="Draft"
                campaigns={draftCampaigns}
                onDrop={handleDrop}
                onCardClick={setSelectedCampaign}
                count={draftCampaigns.length}
              />
              <Column
                title="ACTIVE"
                status="Active"
                campaigns={activeCampaigns}
                onDrop={handleDrop}
                onCardClick={setSelectedCampaign}
                count={activeCampaigns.length}
              />
              <Column
                title="PAUSED"
                status="Paused"
                campaigns={pausedCampaigns}
                onDrop={handleDrop}
                onCardClick={setSelectedCampaign}
                count={pausedCampaigns.length}
              />
              <Column
                title="COMPLETED"
                status="Completed"
                campaigns={completedCampaigns}
                onDrop={handleDrop}
                onCardClick={setSelectedCampaign}
                count={completedCampaigns.length}
              />
            </div>
          </div>
        </div>

        {/* Campaign Detail Modal */}
        {selectedCampaign && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
            onClick={() => setSelectedCampaign(null)}
          >
            <div
              className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "#6CC3DA" }}
                  >
                    <Megaphone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2
                      className="text-3xl"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
                    >
                      {selectedCampaign.title.toUpperCase()}
                    </h2>
                    <p className="text-gray-600">{selectedCampaign.sport}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-black uppercase mb-2">Description</h3>
                  <p className="text-black leading-relaxed">{selectedCampaign.description}</p>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-black" />
                    <p className="text-2xl font-bold text-black">
                      {selectedCampaign.applicants}
                    </p>
                    <p className="text-xs text-black">Applicants</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-black" />
                    <p className="text-2xl font-bold text-black">
                      {selectedCampaign.interestedAthletes}
                    </p>
                    <p className="text-xs text-black">Interested</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Eye className="w-6 h-6 mx-auto mb-2 text-black" />
                    <p className="text-2xl font-bold text-black">
                      {selectedCampaign.views}
                    </p>
                    <p className="text-xs text-black">Views</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-black" />
                    <p className="text-2xl font-bold text-black">
                      ${selectedCampaign.budget.toLocaleString()}
                    </p>
                    <p className="text-xs text-black">Budget</p>
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-black uppercase">Budget Utilization</h3>
                    <span className="text-sm font-bold text-black">
                      ${selectedCampaign.budgetSpent.toLocaleString()} / ${selectedCampaign.budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min((selectedCampaign.budgetSpent / selectedCampaign.budget) * 100, 100)}%`,
                        backgroundColor: "#6CC3DA",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-black uppercase mb-2">Start Date</h3>
                    <p className="text-black">{selectedCampaign.startDate}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-black uppercase mb-2">End Date</h3>
                    <p className="text-black">{selectedCampaign.endDate}</p>
                  </div>
                </div>

                {/* Deliverables */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-black uppercase mb-3">Deliverables</h3>
                  <div className="space-y-2">
                    {selectedCampaign.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#6CC3DA" }}></div>
                        <span className="text-black">{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-black uppercase mb-3">Requirements</h3>
                  <div className="space-y-2">
                    {selectedCampaign.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#6CC3DA" }}></div>
                        <span className="text-black">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className="px-4 py-3 rounded-lg font-bold text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#6CC3DA" }}
                  >
                    <Edit3 className="w-4 h-4" />
                    EDIT
                  </button>
                  <button className="px-4 py-3 rounded-lg font-bold border-2 hover:bg-gray-50 transition-colors text-black flex items-center justify-center gap-2"
                    style={{ borderColor: "#6CC3DA" }}
                  >
                    {selectedCampaign.status === "Paused" ? (
                      <>
                        <Play className="w-4 h-4" />
                        RESUME
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        PAUSE
                      </>
                    )}
                  </button>
                  <button className="px-4 py-3 rounded-lg font-bold border-2 hover:bg-gray-50 transition-colors text-black flex items-center justify-center gap-2"
                    style={{ borderColor: "#6CC3DA" }}
                  >
                    <Users className="w-4 h-4" />
                    APPLICANTS
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}