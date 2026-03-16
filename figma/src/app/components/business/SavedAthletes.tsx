import { useState } from "react";
import { Heart, X, Instagram, Music } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import verifiedBadge from "figma:asset/ca468867dfa4a1eff88a3f26a2ee7a5fe019287d.png";

// Athlete images
import athlete1 from "figma:asset/594749c3b7bd5353d70eec87f21a9f2b7a4bf9de.png";
import athlete2 from "figma:asset/c4cbe0614442693f8290d93d8d6352abc0ed7173.png";
import athlete6 from "figma:asset/6b531532c653b50479de979b2ecbe8697d189b8c.png";

interface Athlete {
  id: number;
  name: string;
  sport: string;
  school: string;
  location: string;
  profileImage: string;
  followers: number;
  instagramFollowers: number;
  tiktokFollowers: number;
  engagementRate: number;
  compatibilityScore: number;
  priceRange: string;
  position: string;
  verified: boolean;
}

export function SavedAthletes() {
  const [savedAthletes, setSavedAthletes] = useState<number[]>([1, 2, 6, 8]); // Pre-saved for demo
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  // Mock data - same athletes from Research
  const allAthletes: Athlete[] = [
    {
      id: 1,
      name: "Marcus Johnson",
      sport: "Basketball",
      school: "State University",
      location: "Texas",
      profileImage: athlete1,
      followers: 37900,
      instagramFollowers: 25000,
      tiktokFollowers: 15000,
      engagementRate: 8.5,
      compatibilityScore: 94,
      priceRange: "$500-$2000",
      position: "Point Guard",
      verified: true,
    },
    {
      id: 2,
      name: "Sarah Chen",
      sport: "Soccer",
      school: "Pacific University",
      location: "California",
      profileImage: athlete2,
      followers: 28500,
      instagramFollowers: 18000,
      tiktokFollowers: 10000,
      engagementRate: 9.2,
      compatibilityScore: 88,
      priceRange: "$400-$1500",
      position: "Forward",
      verified: false,
    },
    {
      id: 6,
      name: "Aisha Patel",
      sport: "Tennis",
      school: "Coastal Academy",
      location: "Florida",
      profileImage: athlete6,
      followers: 32100,
      instagramFollowers: 20000,
      tiktokFollowers: 12000,
      engagementRate: 8.8,
      compatibilityScore: 92,
      priceRange: "$600-$2500",
      position: "Singles",
      verified: false,
    },
    {
      id: 8,
      name: "Maya Thompson",
      sport: "Gymnastics",
      school: "Elite Institute",
      location: "California",
      profileImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBneW1uYXN0aWNzJTIwYXRobGV0ZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MTgyMTY5NXww&ixlib=rb-4.1.0&q=80&w=1080",
      followers: 51300,
      instagramFollowers: 35000,
      tiktokFollowers: 25000,
      engagementRate: 11.2,
      compatibilityScore: 96,
      priceRange: "$1000-$4000",
      position: "All-Around",
      verified: true,
    },
  ];

  const athletes = allAthletes.filter(athlete => savedAthletes.includes(athlete.id));

  const toggleSave = (id: number) => {
    setSavedAthletes(prev => prev.filter(athleteId => athleteId !== id));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-7xl mx-auto">
          <h1
            className="text-5xl mb-2 tracking-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
          >
            SAVED ATHLETES
          </h1>
          <p className="text-gray-600">
            {athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'} saved for later review
          </p>
        </div>
      </div>

      {/* Athlete List */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {athletes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                No Saved Athletes Yet
              </h2>
              <p className="text-gray-600">
                Save athletes from the Research page to keep track of potential partnerships
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {athletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer flex items-center gap-6"
                  onClick={() => setSelectedAthlete(athlete)}
                >
                  {/* Profile Image */}
                  <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={athlete.profileImage}
                      alt={athlete.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name and College */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-2xl font-bold text-black"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {athlete.name}
                      </h3>
                      {athlete.verified && (
                        <img
                          src={verifiedBadge}
                          alt="Verified"
                          className="w-5 h-5"
                          style={{ color: "#6CC3DA" }}
                        />
                      )}
                    </div>
                    <p className="text-gray-600">{athlete.school}</p>
                  </div>

                  {/* Followers */}
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-500 mb-1">Followers</p>
                    <p className="text-lg font-bold text-black">
                      {(athlete.followers / 1000).toFixed(1)}K
                    </p>
                  </div>

                  {/* Engagement */}
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-500 mb-1">Engagement</p>
                    <p className="text-lg font-bold text-black">
                      {athlete.engagementRate}%
                    </p>
                  </div>

                  {/* Price Range */}
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-500 mb-1">Est. Price</p>
                    <p className="text-lg font-bold text-black">{athlete.priceRange}</p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(athlete.id);
                    }}
                    className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remove from saved"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Athlete Preview Modal */}
      {selectedAthlete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedAthlete(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2
                className="text-3xl"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
              >
                ATHLETE PREVIEW
              </h2>
              <button
                onClick={() => setSelectedAthlete(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={selectedAthlete.profileImage}
                    alt={selectedAthlete.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-4xl font-bold text-black"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {selectedAthlete.name.toUpperCase()}
                      </h3>
                      {selectedAthlete.verified && (
                        <img src={verifiedBadge} alt="Verified" className="w-6 h-6" />
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(selectedAthlete.id);
                        setSelectedAthlete(null);
                      }}
                      className="p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Remove from saved"
                    >
                      <Heart className="w-6 h-6 fill-current" />
                    </button>
                  </div>
                  <p className="text-lg text-gray-700 mb-1">
                    <span className="font-bold">{selectedAthlete.position}</span> • {selectedAthlete.sport}
                  </p>
                  <p className="text-gray-600 mb-4">{selectedAthlete.school} • {selectedAthlete.location}</p>

                  {/* Social Media Breakdown */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <p className="text-xs text-gray-500 font-medium font-bold">Instagram Followers</p>
                      </div>
                      <p className="text-2xl font-bold text-black">
                        {(selectedAthlete.instagramFollowers / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="w-4 h-4 text-black" />
                        <p className="text-xs text-gray-500 font-medium font-bold">TikTok Followers</p>
                      </div>
                      <p className="text-2xl font-bold text-black">
                        {(selectedAthlete.tiktokFollowers / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>

                  {/* Engagement and Compatibility */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-bold">Engagement Rate</p>
                      <p className="text-2xl font-bold text-black">
                        {selectedAthlete.engagementRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-bold">Compatibility</p>
                      <p className="text-2xl font-bold text-black">
                        {selectedAthlete.compatibilityScore}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#6CC3DA" }}
                >
                  VIEW FULL PROFILE
                </button>
                <button
                  className="flex-1 px-6 py-3 rounded-lg font-bold border-2 hover:bg-gray-50 transition-colors text-gray-700"
                  style={{ borderColor: "#6CC3DA" }}
                >
                  SEND OPPORTUNITY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}