import { Search, Filter, MapPin, Clock, DollarSign, Building2 } from "lucide-react";
import { useState } from "react";

export function OpportunitiesFeed() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const opportunities = [
    {
      id: 1,
      company: "PowerFuel Energy",
      logo: "PF",
      type: "Social Media Campaign",
      compensation: "$1,500 - $2,500",
      location: "Remote",
      posted: "2 days ago",
      description: "Looking for athletes to promote our new energy drink line on social media.",
      category: "social",
    },
    {
      id: 2,
      company: "Campus Threads",
      logo: "CT",
      type: "Product Endorsement",
      compensation: "$1,000 - $2,000",
      location: "Local",
      posted: "3 days ago",
      description: "Seeking athletes to model and endorse our college apparel brand.",
      category: "product",
    },
    {
      id: 3,
      company: "TechGear Pro",
      logo: "TG",
      type: "Event Appearance",
      compensation: "$2,500 - $4,000",
      location: "On-site",
      posted: "5 days ago",
      description: "Appear at our tech expo and meet fans while representing our brand.",
      category: "event",
    },
    {
      id: 4,
      company: "FitLife Nutrition",
      logo: "FL",
      type: "Product Review",
      compensation: "$800 - $1,200",
      location: "Remote",
      posted: "1 week ago",
      description: "Create authentic review content for our supplements and nutrition products.",
      category: "social",
    },
    {
      id: 5,
      company: "Auto World Dealership",
      logo: "AW",
      type: "Commercial Shoot",
      compensation: "$3,000 - $5,000",
      location: "On-site",
      posted: "1 week ago",
      description: "Star in our local TV commercial promoting our dealership and values.",
      category: "content",
    },
    {
      id: 6,
      company: "Study Buddy App",
      logo: "SB",
      type: "Brand Ambassador",
      compensation: "$1,500/month",
      location: "Remote",
      posted: "2 weeks ago",
      description: "Become a long-term ambassador for our student education platform.",
      category: "ambassador",
    },
    {
      id: 7,
      company: "Local Pizza Co",
      logo: "LP",
      type: "Social Media Partnership",
      compensation: "$500 - $800",
      location: "Local",
      posted: "2 weeks ago",
      description: "Partner with us for social media content showcasing our food.",
      category: "social",
    },
    {
      id: 8,
      company: "Streaming Service Plus",
      logo: "SS",
      type: "Content Creation",
      compensation: "$2,000 - $3,000",
      location: "Remote",
      posted: "3 weeks ago",
      description: "Create engaging content about your streaming experience for our campaign.",
      category: "content",
    },
  ];

  const filters = [
    { id: "all", label: "All Opportunities" },
    { id: "social", label: "Social Media" },
    { id: "product", label: "Product Endorsement" },
    { id: "event", label: "Events" },
    { id: "ambassador", label: "Ambassador" },
    { id: "content", label: "Content Creation" },
  ];

  const filteredOpportunities =
    selectedFilter === "all"
      ? opportunities
      : opportunities.filter((opp) => opp.category === selectedFilter);

  return (
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-6xl mb-2 tracking-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
        >
          OPPORTUNITIES
        </h1>
        <p className="text-gray-600">
          Browse sponsorship opportunities from businesses looking to partner
        </p>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search opportunities..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6CC3DA] transition-colors text-gray-900"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:border-[#6CC3DA] transition-colors text-gray-900">
          <Filter className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* Category Filters */}
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
              selectedFilter === filter.id
                ? "bg-[#6CC3DA] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#6CC3DA]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredOpportunities.map((opp) => (
          <div
            key={opp.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#6CC3DA]/50 transition-all shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
                >
                  {opp.logo}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-gray-900">{opp.company}</h3>
                  <p className="text-sm text-gray-600">{opp.type}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{opp.posted}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">{opp.description}</p>

            {/* Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" style={{ color: "#6CC3DA" }} />
                <span style={{ color: "#6CC3DA" }} className="font-medium">
                  {opp.compensation}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{opp.location}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              className="w-full py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#6CC3DA", color: "#ffffff" }}
            >
              CONNECT
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOpportunities.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No opportunities found in this category</p>
        </div>
      )}
    </div>
  );
}