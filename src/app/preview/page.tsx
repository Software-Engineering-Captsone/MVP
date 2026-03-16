import Link from 'next/link';
import { Zap } from 'lucide-react';

export const metadata = {
  title: 'Preview Dashboard — NILINK',
  description: 'Preview the NILINK dashboard as either an athlete or a business.',
};

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFFAFC] via-white to-[#D7F0F6] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-3 bg-[#6CC3DA] rounded-xl">
            <Zap className="w-10 h-10 text-white" fill="white" />
          </div>
        </div>
        <h1
          className="text-8xl tracking-tight mb-4"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}
        >
          NILINK
        </h1>
        <p className="text-xl text-gray-600 max-w-xl mx-auto">
          Preview the dashboard experience. Choose your account type to explore.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-3xl w-full">
        {/* Athlete Card */}
        <Link
          href="/dashboard?accountType=athlete"
          className="group relative bg-white rounded-2xl border-2 border-gray-200 p-10 text-center hover:border-[#6CC3DA] hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#6CC3DA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6CC3DA] flex items-center justify-center text-white text-3xl">
              🏀
            </div>
            <h2
              className="text-4xl mb-3 tracking-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}
            >
              ATHLETE VIEW
            </h2>
            <p className="text-gray-600 mb-6">
              Explore your dashboard, manage deals, edit your profile, and discover sponsorship opportunities.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#6CC3DA' }}
            >
              ENTER AS ATHLETE →
            </div>
          </div>
        </Link>

        {/* Business Card */}
        <Link
          href="/dashboard?accountType=business"
          className="group relative bg-white rounded-2xl border-2 border-gray-200 p-10 text-center hover:border-[#6CC3DA] hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#6CC3DA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6CC3DA] flex items-center justify-center text-white text-3xl">
              🏢
            </div>
            <h2
              className="text-4xl mb-3 tracking-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#6CC3DA' }}
            >
              BUSINESS VIEW
            </h2>
            <p className="text-gray-600 mb-6">
              Research athletes, manage campaigns, track analytics, and handle sponsorship deals.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#6CC3DA' }}
            >
              ENTER AS BUSINESS →
            </div>
          </div>
        </Link>
      </div>

      <p className="mt-12 text-sm text-gray-500">
        This is a preview mode. No login required. You can switch between views using the toggle in the sidebar.
      </p>
    </div>
  );
}
