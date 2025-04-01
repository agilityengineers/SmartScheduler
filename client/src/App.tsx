import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import { TutorialProvider, useTutorial } from "@/contexts/TutorialContext";
import Tutorial from "@/components/tutorial/Tutorial";
import TutorialWelcomeModal from "@/components/tutorial/TutorialWelcomeModal";
import TourManager from "@/components/tutorial/TourManager";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ScheduledEvents from "@/pages/ScheduledEvents";
import BookingLinks from "@/pages/BookingLinks";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import SetNewPassword from "@/pages/SetNewPassword";
import AdminDashboard from "@/pages/AdminDashboard";
import OrganizationDashboard from "@/pages/OrganizationDashboard";
import TeamDashboard from "@/pages/TeamDashboard";
import Integrations from "@/pages/Integrations";
import Profile from "@/pages/Profile";
import HelpSupport from "@/pages/HelpSupport";

// Documentation and tutorial pages
import ApiDocumentation from "@/pages/documentation/ApiDocumentation";
import AdminGuide from "@/pages/documentation/AdminGuide";
import GettingStartedGuide from "@/pages/documentation/GettingStartedGuide";
import KnowledgeBase from "@/pages/documentation/KnowledgeBase";
import ArticlePage from "@/pages/documentation/ArticlePage";
import CalendarGettingStarted from "@/pages/tutorials/CalendarGettingStarted";
import BookingLinksTutorial from "@/pages/tutorials/BookingLinksTutorial";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/events" component={ScheduledEvents} />
      <Route path="/booking" component={BookingLinks} />
      <Route path="/settings" component={Settings} />
      <Route path="/integrations" component={Integrations} />
      {/* Authentication routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/set-new-password" component={SetNewPassword} />
      
      {/* Role-based dashboard routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminDashboard} />
      <Route path="/admin/organizations" component={AdminDashboard} />
      <Route path="/admin/teams" component={AdminDashboard} />
      
      <Route path="/organization" component={OrganizationDashboard} />
      <Route path="/organization/teams" component={OrganizationDashboard} />
      <Route path="/organization/members" component={OrganizationDashboard} />
      
      <Route path="/team" component={TeamDashboard} />
      <Route path="/team/members" component={TeamDashboard} />
      <Route path="/team/schedule" component={TeamDashboard} />
      
      {/* Profile page */}
      <Route path="/profile" component={Profile} />
      
      {/* Help & Support */}
      <Route path="/help" component={HelpSupport} />
      <Route path="/help/documentation/GettingStartedGuide" component={GettingStartedGuide} />
      <Route path="/help/documentation/ApiDocumentation" component={ApiDocumentation} />
      <Route path="/help/documentation/AdminGuide" component={AdminGuide} />
      <Route path="/help/documentation/KnowledgeBase" component={KnowledgeBase} />
      <Route path="/help/documentation/article/:articleId" component={ArticlePage} />
      <Route path="/help/tutorials/calendar-getting-started" component={CalendarGettingStarted} />
      <Route path="/help/tutorials/booking-links" component={BookingLinksTutorial} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrapper component to use TutorialContext hooks
const TutorialFeatures = () => {
  const { activeFeatureTour } = useTutorial();
  
  return (
    <>
      <Tutorial />
      <TutorialWelcomeModal />
      <TourManager activeTour={activeFeatureTour} />
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TutorialProvider>
          <Router />
          <TutorialFeatures />
          <Toaster />
        </TutorialProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
