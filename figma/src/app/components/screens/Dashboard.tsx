import { TrendingUp, Briefcase, MessageSquare, CheckCircle2, DollarSign, Calendar } from "lucide-react";

export function Dashboard() {
  const activeDeals = [
    {
      id: 1,
      brand: "PowerFuel Energy",
      type: "Social Media Campaign",
      value: "$2,500",
      deadline: "Mar 15, 2026",
      status: "active",
    },
    {
      id: 2,
      brand: "Campus Threads",
      type: "Product Endorsement",
      value: "$1,800",
      deadline: "Mar 28, 2026",
      status: "active",
    },
    {
      id: 3,
      brand: "TechGear Pro",
      type: "Event Appearance",
      value: "$3,200",
      deadline: "Apr 5, 2026",
      status: "active",
    },
  ];

  const opportunities = [
    {
      id: 1,
      company: "FitLife Nutrition",
      type: "Product Review",
      compensation: "$800 - $1,200",
      posted: "2 days ago",
    },
    {
      id: 2,
      company: "Local Auto Dealership",
      type: "Commercial Shoot",
      compensation: "$2,000 - $3,500",
      posted: "5 days ago",
    },
    {
      id: 3,
      company: "Study App Co",
      type: "Brand Ambassador",
      compensation: "$1,500/month",
      posted: "1 week ago",
    },
  ];

  return (
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-6xl mb-2 tracking-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
        >
          DASHBOARD
        </h1>
        <p className="text-gray-600">Welcome back, Marcus. Here's your NIL activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-3xl font-bold mb-1" style={{ color: "#6CC3DA" }}>
            $7,500
          </h3>
          <p className="text-sm text-gray-600">Total Earnings</p>
          
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-3xl font-bold mb-1" style={{ color: "#6CC3DA" }}>
            3
          </h3>
          <p className="text-sm text-gray-600">Active Deals</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-3xl font-bold" style={{ color: "#6CC3DA" }}>
              5
            </h3>
            
          </div>
          <p className="text-sm text-gray-600">Unread Messages</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-3xl font-bold mb-1" style={{ color: "#6CC3DA" }}>
            85%
          </h3>
          <p className="text-sm text-gray-600">Profile Complete</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Active Deals */}
        <div>
          <h2
            className="text-3xl mb-4 tracking-tight text-gray-900"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            ACTIVE DEALS
          </h2>
          <div className="space-y-4">
            {activeDeals.map((deal) => (
              <div
                key={deal.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:border-[#6CC3DA]/50 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">{deal.brand}</h3>
                    <p className="text-sm text-gray-600">{deal.type}</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                  >
                    {deal.value}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {deal.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Opportunities */}
        <div>
          <h2
            className="text-3xl mb-4 tracking-tight text-gray-900"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            NEW OPPORTUNITIES
          </h2>
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:border-[#6CC3DA]/50 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-gray-900">{opp.company}</h3>
                    <p className="text-sm text-gray-600">{opp.type}</p>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                  >
                    CONNECT
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "#6CC3DA" }} className="font-semibold">{opp.compensation}</span>
                  <span className="text-gray-500">{opp.posted}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Completion */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-2xl mb-1 tracking-tight text-gray-900"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              COMPLETE YOUR PROFILE
            </h2>
            <p className="text-sm text-gray-600">
              A complete profile gets 3x more sponsorship offers
            </p>
          </div>
          <span className="text-3xl font-bold" style={{ color: "#6CC3DA" }}>
            85%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: "85%", backgroundColor: "#6CC3DA" }}
          ></div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-900">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#6CC3DA" }} />
            <span>Basic Info</span>
          </div>
          <div className="flex items-center gap-2 text-gray-900">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#6CC3DA" }} />
            <span>Social Links</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-gray-400"></div>
            <span className="text-gray-500">Achievements</span>
          </div>
        </div>
      </div>
    </div>
  );
}