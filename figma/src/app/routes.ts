import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { Dashboard } from "./components/screens/Dashboard";
import { ProfileEditor } from "./components/screens/ProfileEditor";
import { OpportunitiesFeed } from "./components/screens/OpportunitiesFeed";
import { DealManagement } from "./components/screens/DealManagement";
import { Messaging } from "./components/screens/Messaging";
import { AthleteProfile } from "./components/screens/AthleteProfile";
import { BusinessLayout } from "./components/BusinessLayout";
import { Research } from "./components/business/Research";
import { SavedAthletes } from "./components/business/SavedAthletes";
import { BusinessProfile } from "./components/business/BusinessProfile";
import { BusinessDeals } from "./components/business/BusinessDeals";
import { BusinessCampaigns } from "./components/business/BusinessCampaigns";
import { BusinessAnalytics } from "./components/business/BusinessAnalytics";
import { ExploreCollege } from "./components/business/ExploreCollege";
import { CollegeDetail } from "./components/business/CollegeDetail";
import { BusinessMessages } from "./components/business/BusinessMessages";
import { ErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    ErrorBoundary,
    children: [
      { index: true, Component: Dashboard },
      { path: "profile", Component: ProfileEditor },
      { path: "profile/view", Component: AthleteProfile },
      { path: "opportunities", Component: OpportunitiesFeed },
      { path: "deals", Component: DealManagement },
      { path: "messages", Component: Messaging },
    ],
  },
  {
    path: "/business",
    Component: BusinessLayout,
    ErrorBoundary,
    children: [
      { index: true, Component: Research },
      { path: "saved", Component: SavedAthletes },
      { path: "college", Component: ExploreCollege },
      { path: "college/:id", Component: CollegeDetail },
      { path: "profile", Component: BusinessProfile },
      { path: "deals", Component: BusinessDeals },
      { path: "campaigns", Component: BusinessCampaigns },
      { path: "analytics", Component: BusinessAnalytics },
      { path: "messages", Component: BusinessMessages },
    ],
  },
]);
