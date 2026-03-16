import { CheckCircle2, Clock, Archive, Calendar, DollarSign, FileText } from "lucide-react";
import { useState } from "react";

export function DealManagement() {
  const [selectedTab, setSelectedTab] = useState<"active" | "pending" | "completed">("active");

  const deals = {
    active: [
      {
        id: 1,
        brand: "PowerFuel Energy",
        logo: "PF",
        type: "Social Media Campaign",
        value: "$2,500",
        startDate: "Feb 1, 2026",
        endDate: "Mar 15, 2026",
        deliverables: "5 Instagram posts, 3 Stories per week",
        status: "On Track",
      },
      {
        id: 2,
        brand: "Campus Threads",
        logo: "CT",
        type: "Product Endorsement",
        value: "$1,800",
        startDate: "Feb 10, 2026",
        endDate: "Mar 28, 2026",
        deliverables: "2 TikTok videos, Wear apparel at games",
        status: "On Track",
      },
      {
        id: 3,
        brand: "TechGear Pro",
        logo: "TG",
        type: "Event Appearance",
        value: "$3,200",
        startDate: "Mar 1, 2026",
        endDate: "Apr 5, 2026",
        deliverables: "Appear at expo, 2-hour meet & greet",
        status: "Upcoming",
      },
    ],
    pending: [
      {
        id: 4,
        brand: "FitLife Nutrition",
        logo: "FL",
        type: "Product Review",
        value: "$1,000",
        submittedDate: "Feb 20, 2026",
        estimatedStart: "Mar 1, 2026",
        deliverables: "Product review video, Social posts",
        status: "Under Review",
      },
      {
        id: 5,
        brand: "Study Buddy App",
        logo: "SB",
        type: "Brand Ambassador",
        value: "$1,500/mo",
        submittedDate: "Feb 18, 2026",
        estimatedStart: "Mar 15, 2026",
        deliverables: "Monthly content, Campus promotion",
        status: "Negotiating",
      },
    ],
    completed: [
      {
        id: 6,
        brand: "Local Auto Dealership",
        logo: "AW",
        type: "Commercial Shoot",
        value: "$3,500",
        completedDate: "Jan 28, 2026",
        duration: "Jan 15 - Jan 28, 2026",
        deliverables: "TV commercial appearance",
        rating: 5,
      },
      {
        id: 7,
        brand: "Sports Drink Co",
        logo: "SD",
        type: "Social Media Campaign",
        value: "$2,000",
        completedDate: "Jan 20, 2026",
        duration: "Dec 1, 2025 - Jan 20, 2026",
        deliverables: "6 Instagram posts, Stories",
        rating: 4,
      },
      {
        id: 8,
        brand: "Shoe Brand Elite",
        logo: "SB",
        type: "Product Endorsement",
        value: "$2,800",
        completedDate: "Dec 30, 2025",
        duration: "Nov 1 - Dec 30, 2025",
        deliverables: "Wear shoes in games, 4 posts",
        rating: 5,
      },
    ],
  };

  const tabs = [
    { id: "active" as const, label: "Active", count: deals.active.length, icon: CheckCircle2 },
    { id: "pending" as const, label: "Pending", count: deals.pending.length, icon: Clock },
    { id: "completed" as const, label: "Completed", count: deals.completed.length, icon: Archive },
  ];

  return (
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-6xl mb-2 tracking-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
        >
          DEAL MANAGEMENT
        </h1>
        <p className="text-gray-600">Track and manage all your NIL deals in one place</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-4 font-bold transition-all relative ${
              selectedTab === tab.id
                ? "text-[#6CC3DA]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                selectedTab === tab.id
                  ? "bg-[#6CC3DA] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.count}
            </span>
            {selectedTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1 rounded-t"
                style={{ backgroundColor: "#6CC3DA" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Active Deals */}
      {selectedTab === "active" && (
        <div className="space-y-6">
          {deals.active.map((deal) => (
            <div
              key={deal.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#6CC3DA]/50 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                    style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                  >
                    {deal.logo}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1 text-gray-900">{deal.brand}</h3>
                    <p className="text-sm text-gray-600">{deal.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "#6CC3DA" }}>
                    {deal.value}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                      deal.status === "On Track"
                        ? "bg-green-500/20 text-green-600"
                        : "bg-blue-500/20 text-blue-600"
                    }`}
                  >
                    {deal.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">START DATE</p>
                  <p className="text-sm font-medium text-gray-900">{deal.startDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">END DATE</p>
                  <p className="text-sm font-medium text-gray-900">{deal.endDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">DELIVERABLES</p>
                  <p className="text-sm font-medium text-gray-900">{deal.deliverables}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-2 px-4 bg-white border border-gray-200 rounded-lg hover:border-[#6CC3DA] transition-colors font-medium text-sm text-gray-900">
                  View Details
                </button>
                <button className="flex-1 py-2 px-4 bg-white border border-gray-200 rounded-lg hover:border-[#6CC3DA] transition-colors font-medium text-sm text-gray-900">
                  Upload Content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Deals */}
      {selectedTab === "pending" && (
        <div className="space-y-6">
          {deals.pending.map((deal) => (
            <div
              key={deal.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#6CC3DA]/50 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                    style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                  >
                    {deal.logo}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1 text-gray-900">{deal.brand}</h3>
                    <p className="text-sm text-gray-600">{deal.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "#6CC3DA" }}>
                    {deal.value}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                      deal.status === "Under Review"
                        ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-purple-500/20 text-purple-600"
                    }`}
                  >
                    {deal.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">SUBMITTED</p>
                  <p className="text-sm font-medium text-gray-900">{deal.submittedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">EST. START</p>
                  <p className="text-sm font-medium text-gray-900">{deal.estimatedStart}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">DELIVERABLES</p>
                  <p className="text-sm font-medium text-gray-900">{deal.deliverables}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-2 px-4 bg-white border border-gray-200 rounded-lg hover:border-[#6CC3DA] transition-colors font-medium text-sm text-gray-900">
                  View Details
                </button>
                <button className="flex-1 py-2 px-4 bg-white border border-gray-200 rounded-lg hover:border-[#6CC3DA] transition-colors font-medium text-sm text-gray-900">
                  Message Brand
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Deals */}
      {selectedTab === "completed" && (
        <div className="space-y-6">
          {deals.completed.map((deal) => (
            <div
              key={deal.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#6CC3DA]/50 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                    style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                  >
                    {deal.logo}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1 text-gray-900">{deal.brand}</h3>
                    <p className="text-sm text-gray-600">{deal.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "#6CC3DA" }}>
                    {deal.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2 justify-end">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 ${
                          i < deal.rating ? "text-[#6CC3DA]" : "text-gray-300"
                        }`}
                      >
                        ★
                      </div>
                    ))}\
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">COMPLETED</p>
                  <p className="text-sm font-medium text-gray-900">{deal.completedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">DURATION</p>
                  <p className="text-sm font-medium text-gray-900">{deal.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">DELIVERABLES</p>
                  <p className="text-sm font-medium text-gray-900">{deal.deliverables}</p>
                </div>
              </div>

              <button className="w-full py-2 px-4 bg-white border border-gray-200 rounded-lg hover:border-[#6CC3DA] transition-colors font-medium text-sm text-gray-900">
                View Deal Summary
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
