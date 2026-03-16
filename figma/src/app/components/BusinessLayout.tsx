import { Outlet, NavLink } from "react-router";
import { Search, Building2, CreditCard, Megaphone, BarChart3, Zap, ArrowLeftRight, GraduationCap, MessageSquare, Heart } from "lucide-react";
import { useState } from "react";
import sidebarToggleIcon from "figma:asset/9d3d0f52762bc7c8fc28282c129d76226559ff9f.png";

export function BusinessLayout() {
  const [showViewSwitcher, setShowViewSwitcher] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const navItems = [
    { to: "/business", icon: Search, label: "Research" },
    { to: "/business/saved", icon: Heart, label: "Saved Athletes" },
    { to: "/business/college", icon: GraduationCap, label: "Explore College" },
    { to: "/business/profile", icon: Building2, label: "Profile" },
    { to: "/business/deals", icon: CreditCard, label: "Payments & Deals" },
    { to: "/business/campaigns", icon: Megaphone, label: "Campaigns" },
    { to: "/business/analytics", icon: BarChart3, label: "Overall Analytics" },
    { to: "/business/messages", icon: MessageSquare, label: "Messages" },
  ];

  const shouldShowText = !isCollapsed || isHovering;

  return (
    <div className="flex h-screen text-gray-900" style={{ backgroundColor: '#EFFAFC' }}>
      {/* Sidebar */}
      <aside 
        className={`${shouldShowText ? 'w-64' : 'w-20'} bg-white flex flex-col shadow-sm transition-all duration-300`}
        style={{ borderRight: '1px solid #B4E2ED' }}
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={() => isCollapsed && setIsHovering(false)}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-8 h-8 flex-shrink-0" style={{ color: "#6CC3DA" }} fill="#6CC3DA" />
              {shouldShowText && (
                <h1
                  className="text-3xl tracking-tight whitespace-nowrap"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#6CC3DA" }}
                >
                  NILINK
                </h1>
              )}
            </div>
            {shouldShowText && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <img src={sidebarToggleIcon} alt="Toggle sidebar" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/business"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#6CC3DA] text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    } ${!shouldShowText ? 'justify-center' : ''}`
                  }
                  title={!shouldShowText ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {shouldShowText && <span className="font-medium whitespace-nowrap">{item.label}</span>}
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
              className={`w-full flex items-center ${shouldShowText ? 'justify-between' : 'justify-center'} gap-3 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors`}
              title={!shouldShowText ? "Switch View" : undefined}
            >
              <div className={`flex items-center gap-3 ${!shouldShowText ? 'justify-center' : ''}`}>
                <ArrowLeftRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                {shouldShowText && <span className="font-medium text-gray-900 whitespace-nowrap">Switch View</span>}
              </div>
            </button>

            {showViewSwitcher && (
              <div className={`absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden ${shouldShowText ? 'left-0 right-0' : 'left-0 w-64'}`}>
                <a
                  href="/"
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-900"
                >
                  <div className="font-medium">Athlete View</div>
                  <div className="text-xs text-gray-500">Manage your profile</div>
                </a>
                <div className="px-4 py-3 bg-[#6CC3DA]/10">
                  <div className="font-medium" style={{ color: "#6CC3DA" }}>Business View</div>
                  <div className="text-xs text-gray-600">Find athletes</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center gap-3 px-4 py-3 ${!shouldShowText ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-[#6CC3DA] flex items-center justify-center text-white font-bold flex-shrink-0">
              PF
            </div>
            {shouldShowText && (
              <div>
                <p className="font-medium text-gray-900 whitespace-nowrap">PowerFuel Energy</p>
                <p className="text-xs text-gray-500 whitespace-nowrap">Sports Nutrition</p>
              </div>
            )}
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