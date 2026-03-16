import { Outlet, NavLink } from "react-router";
import { Home, User, Search, FileText, MessageSquare, Zap, Eye, ArrowLeftRight } from "lucide-react";
import { useState } from "react";

export function DashboardLayout() {
  const [showViewSwitcher, setShowViewSwitcher] = useState(false);

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/profile", icon: User, label: "Profile" },
    { to: "/opportunities", icon: Search, label: "Opportunities" },
    { to: "/deals", icon: FileText, label: "Deals" },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
  ];

  return (
    <div className="flex h-screen text-gray-900" style={{ backgroundColor: '#EFFAFC' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white flex flex-col shadow-sm" style={{ borderRight: '1px solid #B4E2ED' }}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8" style={{ color: "#6CC3DA" }} fill="#6CC3DA" />
            <h1
              className="text-3xl tracking-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
            >
              NILINK
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Pro NIL Platform</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#6CC3DA] text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* View Switcher */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowViewSwitcher(!showViewSwitcher)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Switch View</span>
              </div>
            </button>

            {showViewSwitcher && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#6CC3DA]/10">
                  <div className="font-medium" style={{ color: "#6CC3DA" }}>Athlete View</div>
                  <div className="text-xs text-gray-600">Manage your profile</div>
                </div>
                <a
                  href="/business"
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900"
                >
                  <div className="font-medium">Business View</div>
                  <div className="text-xs text-gray-500">Find athletes</div>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-[#6CC3DA] flex items-center justify-center text-white font-bold">
              MJ
            </div>
            <div>
              <p className="font-medium text-gray-900">Marcus Johnson</p>
              <p className="text-xs text-gray-500">Basketball • Junior</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}