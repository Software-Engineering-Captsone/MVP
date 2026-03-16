import { useState } from "react";
import { Building2, MapPin, Globe, Mail, Phone, Edit3, Save, X } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

export function BusinessProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "PowerFuel Energy",
    industry: "Sports Nutrition & Supplements",
    location: "Austin, Texas",
    website: "www.powerfuelenergy.com",
    email: "partnerships@powerfuelenergy.com",
    phone: "(512) 555-0123",
    bio: "PowerFuel Energy is a leading sports nutrition brand dedicated to fueling athletic performance at every level. We believe in supporting all athletes—from weekend warriors to collegiate competitors—with science-backed supplements and energy products. Our mission aligns perfectly with NILink's values: giving every athlete a fair opportunity to succeed.",
    mission: "To democratize sports nutrition and empower athletes of all backgrounds to achieve peak performance through accessible, high-quality products.",
    values: ["Athlete-First", "Quality & Transparency", "Inclusive Sports Culture", "Science-Backed Innovation"],
    logoImage: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmVyZ3klMjBkcmluayUyMGJyYW5kJTIwbG9nb3xlbnwxfHx8fDE3NzE4MjE4Mzh8MA&ixlib=rb-4.1.0&q=80&w=400",
    bannerImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneW0lMjBmaXRuZXNzJTIwZW5lcmd5JTIwd29ya291dHxlbnwxfHx8fDE3NzE4MjE4NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
  });

  const activeCampaigns = [
    {
      id: 1,
      title: "Spring Training Fuel Campaign",
      sport: "All Sports",
      budget: "$15,000",
      athletes: 8,
      status: "Active",
    },
    {
      id: 2,
      title: "Basketball Season Sponsorship",
      sport: "Basketball",
      budget: "$25,000",
      athletes: 5,
      status: "Active",
    },
    {
      id: 3,
      title: "Track & Field Partnership",
      sport: "Track & Field",
      budget: "$10,000",
      athletes: 12,
      status: "Active",
    },
  ];

  const testimonials = [
    {
      id: 1,
      athlete: "Marcus Johnson",
      sport: "Basketball",
      school: "State University",
      text: "Working with PowerFuel has been incredible. They truly care about athlete success beyond just the sponsorship—it feels like a real partnership.",
      rating: 5,
    },
    {
      id: 2,
      athlete: "Sarah Chen",
      sport: "Soccer",
      school: "Pacific University",
      text: "PowerFuel's commitment to supporting all athletes, not just the biggest names, aligns perfectly with my values. Proud to represent this brand.",
      rating: 5,
    },
  ];

  const pastCampaigns = [
    { name: "Fall Soccer Kickoff", year: "2025", reach: "185K", engagement: "9.2%" },
    { name: "Winter Training Series", year: "2024", reach: "210K", engagement: "8.8%" },
    { name: "Summer Championship Support", year: "2024", reach: "165K", engagement: "10.1%" },
  ];

  const handleSave = () => {
    // In real app, save to backend
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Edit Toggle Button */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex justify-end">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: isEditing ? "#6CC3DA" : "transparent",
              color: isEditing ? "#ffffff" : "#6CC3DA",
              border: `2px solid #6CC3DA`,
            }}
          >
            {isEditing ? (
              <>
                <X className="w-5 h-5" />
                Cancel Editing
              </>
            ) : (
              <>
                <Edit3 className="w-5 h-5" />
                Edit Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner Image */}
      <div className="relative h-80 w-full">
        <ImageWithFallback
          src={formData.bannerImage}
          alt="Company Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white"></div>
      </div>

      {/* Profile Header Section */}
      <div className="max-w-6xl mx-auto px-8 -mt-32 relative z-10">
        <div className="flex items-end gap-8 mb-8">
          {/* Logo */}
          <div className="relative">
            <div className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white">
              <ImageWithFallback
                src={formData.logoImage}
                alt={formData.companyName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Company Info */}
          <div className="flex-1 pb-4">
            {isEditing ? (
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="text-7xl mb-2 tracking-tight leading-none bg-transparent border-b-2 border-[#6CC3DA] focus:outline-none w-full"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: "#6CC3DA" }}
              />
            ) : (
              <h1
                className="text-7xl mb-2 tracking-tight leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: "#6CC3DA" }}
              >
                {formData.companyName.toUpperCase()}
              </h1>
            )}
            
            <div className="flex items-center gap-6 text-lg text-gray-700 mb-4">
              <span className="flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: "#6CC3DA" }} />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#6CC3DA]"
                  />
                ) : (
                  formData.industry
                )}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: "#6CC3DA" }} />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#6CC3DA]"
                  />
                ) : (
                  formData.location
                )}
              </span>
            </div>

            {/* Contact Info */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {formData.website}
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {formData.email}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {formData.phone}
              </span>
            </div>
          </div>

          {/* Save Button (when editing) */}
          {isEditing && (
            <div className="pb-4">
              <button
                onClick={handleSave}
                className="px-8 py-4 rounded-xl font-bold text-lg text-white hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
                style={{ backgroundColor: "#6CC3DA", fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                <Save className="w-5 h-5" />
                SAVE CHANGES
              </button>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
          <h2
            className="text-3xl mb-4 tracking-tight text-gray-900"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
          >
            ABOUT US
          </h2>
          {isEditing ? (
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full text-gray-700 text-lg leading-relaxed border border-gray-200 rounded-lg p-4 focus:outline-none focus:border-[#6CC3DA]"
            />
          ) : (
            <p className="text-gray-700 text-lg leading-relaxed">{formData.bio}</p>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="mb-8">
          <h2
            className="text-3xl mb-6 tracking-tight text-gray-900"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
          >
            ACTIVE CAMPAIGNS
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {activeCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3
                    className="text-xl font-bold text-gray-900 flex-1"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {campaign.title.toUpperCase()}
                  </h3>
                  <span
                    className="px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: "#6CC3DA" }}
                  >
                    {campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{campaign.sport}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Budget</p>
                    <p className="font-bold text-gray-900">{campaign.budget}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Athletes</p>
                    <p className="font-bold" style={{ color: "#6CC3DA" }}>{campaign.athletes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Athlete Testimonials */}
        <div className="mb-8">
          <h2
            className="text-3xl mb-6 tracking-tight text-gray-900"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
          >
            ATHLETE TESTIMONIALS
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5"
                      fill="#6CC3DA"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.athlete}</p>
                  <p className="text-sm text-gray-600">{testimonial.sport} • {testimonial.school}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Past Campaign Performance */}
        <div className="mb-12">
          <h2
            className="text-3xl mb-6 tracking-tight text-gray-900"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
          >
            PAST CAMPAIGN PERFORMANCE
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="space-y-4">
              {pastCampaigns.map((campaign, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <h4 className="font-bold text-gray-900">{campaign.name}</h4>
                    <p className="text-sm text-gray-500">{campaign.year}</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Reach</p>
                      <p className="font-bold" style={{ color: "#6CC3DA" }}>{campaign.reach}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Avg. Engagement</p>
                      <p className="font-bold" style={{ color: "#6CC3DA" }}>{campaign.engagement}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}