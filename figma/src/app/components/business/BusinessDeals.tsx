import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DollarSign, Calendar, CheckCircle2, Clock, X, User } from "lucide-react";

// Athlete images
import athlete1 from "figma:asset/594749c3b7bd5353d70eec87f21a9f2b7a4bf9de.png";
import athlete2 from "figma:asset/c4cbe0614442693f8290d93d8d6352abc0ed7173.png";
import athlete3 from "figma:asset/05c8a9c932b71287f3b9b3b1529a4874f9fe7b2c.png";
import athlete4 from "figma:asset/9b1ba2d1c2915a7851c1da9d77b40932e94b8beb.png";
import athlete5 from "figma:asset/04224bbbde09d00f8ed258cc38a3e760bd0e1a20.png";
import athlete6 from "figma:asset/6b531532c653b50479de979b2ecbe8697d189b8c.png";

interface Deal {
  id: number;
  athleteName: string;
  athleteImage: string;
  sport: string;
  campaignName: string;
  amount: number;
  paymentSchedule: string;
  deliverables: string[];
  completedDeliverables: number;
  startDate: string;
  endDate: string;
  status: "Active" | "Pending" | "Completed";
}

const ItemTypes = {
  DEAL: "deal",
};

interface DealCardProps {
  deal: Deal;
  onMove: (dealId: number, newStatus: Deal["status"]) => void;
  onClick: (deal: Deal) => void;
}

function DealCard({ deal, onMove, onClick }: DealCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DEAL,
    item: { id: deal.id, currentStatus: deal.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      onClick={() => onClick(deal)}
      className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        {deal.athleteImage ? (
          <img
            src={deal.athleteImage}
            alt={deal.athleteName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#6CC3DA" }}
          >
            {deal.athleteName.split(" ").map(n => n[0]).join("")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 truncate">{deal.athleteName}</h4>
          <p className="text-xs text-gray-500">{deal.sport}</p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700 mb-1">{deal.campaignName}</p>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <p className="text-lg font-bold text-green-600">${deal.amount.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>{deal.startDate} - {deal.endDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" />
          <span>{deal.completedDeliverables}/{deal.deliverables.length} deliverables completed</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min((deal.completedDeliverables / deal.deliverables.length) * 100, 100)}%`,
              backgroundColor: "#6CC3DA",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

interface ColumnProps {
  title: string;
  status: Deal["status"];
  deals: Deal[];
  onDrop: (dealId: number, newStatus: Deal["status"]) => void;
  onCardClick: (deal: Deal) => void;
  count: number;
}

function Column({ title, status, deals, onDrop, onCardClick, count }: ColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.DEAL,
    drop: (item: { id: number; currentStatus: Deal["status"] }) => {
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
      case "Pending":
        return "bg-red-100";
      case "Active":
        return "bg-yellow-100";
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
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onMove={onDrop} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}

export function BusinessDeals() {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [deals, setDeals] = useState<Deal[]>([
    {
      id: 1,
      athleteName: "Marcus Johnson",
      athleteImage: athlete1,
      sport: "Basketball",
      campaignName: "Spring Training Fuel Campaign",
      amount: 2500,
      paymentSchedule: "50% upfront, 50% upon completion",
      deliverables: ["3 Instagram posts", "2 TikTok videos", "1 Product review"],
      completedDeliverables: 2,
      startDate: "Mar 1, 2026",
      endDate: "Apr 30, 2026",
      status: "Active",
    },
    {
      id: 2,
      athleteName: "Sarah Chen",
      athleteImage: athlete2,
      sport: "Soccer",
      campaignName: "Basketball Season Sponsorship",
      amount: 3500,
      paymentSchedule: "Monthly installments",
      deliverables: ["4 Instagram posts", "3 Stories per week", "1 Live session"],
      completedDeliverables: 4,
      startDate: "Feb 15, 2026",
      endDate: "May 15, 2026",
      status: "Active",
    },
    {
      id: 3,
      athleteName: "Tyler Washington",
      athleteImage: athlete3,
      sport: "Football",
      campaignName: "Track & Field Partnership",
      amount: 1800,
      paymentSchedule: "Lump sum payment",
      deliverables: ["2 Instagram posts", "1 TikTok video"],
      completedDeliverables: 0,
      startDate: "Apr 1, 2026",
      endDate: "May 31, 2026",
      status: "Pending",
    },
    {
      id: 4,
      athleteName: "Emily Rodriguez",
      athleteImage: athlete4,
      sport: "Volleyball",
      campaignName: "Summer Campaign",
      amount: 2200,
      paymentSchedule: "50% upfront, 50% upon completion",
      deliverables: ["3 Instagram posts", "2 Reels"],
      completedDeliverables: 0,
      startDate: "May 1, 2026",
      endDate: "Jun 30, 2026",
      status: "Pending",
    },
    {
      id: 5,
      athleteName: "Jordan Blake",
      athleteImage: athlete5,
      sport: "Track & Field",
      campaignName: "Fall Training Campaign",
      amount: 1500,
      paymentSchedule: "Lump sum payment",
      deliverables: ["2 Instagram posts", "1 Story series"],
      completedDeliverables: 3,
      startDate: "Jan 1, 2026",
      endDate: "Feb 28, 2026",
      status: "Completed",
    },
    {
      id: 6,
      athleteName: "Aisha Patel",
      athleteImage: athlete6,
      sport: "Tennis",
      campaignName: "Winter Sponsorship",
      amount: 3000,
      paymentSchedule: "Monthly installments",
      deliverables: ["4 Instagram posts", "3 TikTok videos", "2 Blog features"],
      completedDeliverables: 9,
      startDate: "Dec 1, 2025",
      endDate: "Feb 15, 2026",
      status: "Completed",
    },
  ]);

  const handleDrop = (dealId: number, newStatus: Deal["status"]) => {
    setDeals((prevDeals) =>
      prevDeals.map((deal) =>
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      )
    );
  };

  const activeDeals = deals.filter((d) => d.status === "Active");
  const pendingDeals = deals.filter((d) => d.status === "Pending");
  const completedDeals = deals.filter((d) => d.status === "Completed");

  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);
  const activeValue = activeDeals.reduce((sum, deal) => sum + deal.amount, 0);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-8">
          <div className="max-w-7xl mx-auto">
            <h1
              className="text-5xl mb-2 tracking-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
            >
              PAYMENTS & DEALS
            </h1>
            <p className="text-gray-600 mb-6">Manage your athlete partnerships and payment schedules</p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Total Deals</p>
                <p className="text-3xl font-bold text-black">
                  {deals.length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Active Deals</p>
                <p className="text-3xl font-bold text-black">
                  {activeDeals.length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Total Investment</p>
                <p className="text-3xl font-bold text-black">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-600 mb-2 font-bold">Active Value</p>
                <p className="text-3xl font-bold text-black">
                  ${activeValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-6 h-full">
              <Column
                title="PENDING"
                status="Pending"
                deals={pendingDeals}
                onDrop={handleDrop}
                onCardClick={setSelectedDeal}
                count={pendingDeals.length}
              />
              <Column
                title="ACTIVE"
                status="Active"
                deals={activeDeals}
                onDrop={handleDrop}
                onCardClick={setSelectedDeal}
                count={activeDeals.length}
              />
              <Column
                title="COMPLETED"
                status="Completed"
                deals={completedDeals}
                onDrop={handleDrop}
                onCardClick={setSelectedDeal}
                count={completedDeals.length}
              />
            </div>
          </div>
        </div>

        {/* Deal Detail Modal */}
        {selectedDeal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
            onClick={() => setSelectedDeal(null)}
          >
            <div
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedDeal.athleteImage ? (
                    <img
                      src={selectedDeal.athleteImage}
                      alt={selectedDeal.athleteName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: "#6CC3DA" }}
                    >
                      {selectedDeal.athleteName.split(" ").map(n => n[0]).join("")}
                    </div>
                  )}
                  <div>
                    <h2
                      className="text-3xl"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
                    >
                      {selectedDeal.athleteName.toUpperCase()}
                    </h2>
                    <p className="text-gray-600">{selectedDeal.sport}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDeal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Campaign Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Campaign</h3>
                  <p className="text-xl font-bold text-gray-900">{selectedDeal.campaignName}</p>
                </div>

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-bold text-gray-500 uppercase">Deal Amount</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      ${selectedDeal.amount.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5" style={{ color: "#6CC3DA" }} />
                      <h3 className="text-sm font-bold text-gray-500 uppercase">Duration</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      {selectedDeal.startDate}<br />to {selectedDeal.endDate}
                    </p>
                  </div>
                </div>

                {/* Payment Schedule */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Payment Schedule</h3>
                  <p className="text-gray-700">{selectedDeal.paymentSchedule}</p>
                </div>

                {/* Deliverables */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Deliverables</h3>
                    <span className="text-sm font-bold" style={{ color: "#6CC3DA" }}>
                      {selectedDeal.completedDeliverables}/{selectedDeal.deliverables.length} Completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedDeal.deliverables.map((deliverable, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center ${
                            index < selectedDeal.completedDeliverables
                              ? "bg-[#6CC3DA]"
                              : "bg-gray-300"
                          }`}
                        >
                          {index < selectedDeal.completedDeliverables && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className={index < selectedDeal.completedDeliverables ? "text-gray-900" : "text-gray-500"}>
                          {deliverable}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-6 py-3 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#6CC3DA" }}
                  >
                    VIEW CONTRACT
                  </button>
                  <button className="flex-1 px-6 py-3 rounded-lg font-bold border-2 hover:bg-gray-50 transition-colors text-gray-700"
                    style={{ borderColor: "#6CC3DA" }}
                  >
                    MESSAGE ATHLETE
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