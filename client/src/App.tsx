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
import Availability from "@/pages/Availability";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import SetNewPassword from "@/pages/SetNewPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import ForcePasswordChange from "@/pages/ForcePasswordChange";
import AdminDashboard from "@/pages/AdminDashboard";
import UserManagementDashboard from "@/pages/UserManagementDashboard";
import SubscriptionManagement from "@/pages/admin/SubscriptionManagement";
import StripeProductsManager from "@/pages/admin/StripeProductsManager";
import OrganizationDashboard from "@/pages/OrganizationDashboard";
import TeamDashboard from "@/pages/TeamDashboard";
import Integrations from "@/pages/Integrations";
import Profile from "@/pages/Profile";
import HelpSupport from "@/pages/HelpSupport";
import Contacts from "@/pages/Contacts";
import Workflows from "@/pages/Workflows";
import Analytics from "@/pages/Analytics";
import { PublicBookingPage } from "@/components/booking/PublicBookingPage";
import { PublicPollPage } from "@/components/booking/PublicPollPage";
import { PublicRoutingForm } from "@/components/booking/PublicRoutingForm";
import PublicUserLanding from "@/pages/PublicUserLanding";
import MeetingPolls from "@/pages/MeetingPolls";
import RoutingForms from "@/pages/RoutingForms";
import BookingsManagement from "@/pages/BookingsManagement";
import DiagnosticPage from "@/pages/DiagnosticPage";

// Legal pages
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsOfService from "@/pages/legal/TermsOfService";

// Documentation and tutorial pages
import ApiDocumentation from "@/pages/documentation/ApiDocumentation";
import AdminGuide from "@/pages/documentation/AdminGuide";
import GettingStartedGuide from "@/pages/documentation/GettingStartedGuide";
import KnowledgeBase from "@/pages/documentation/KnowledgeBase";
import ArticlePage from "@/pages/documentation/ArticlePage";
import CalendarGettingStarted from "@/pages/tutorials/CalendarGettingStarted";
import BookingLinksTutorial from "@/pages/tutorials/BookingLinksTutorial";
import TeamSchedulingTutorial from "@/pages/tutorials/TeamSchedulingTutorial";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/events" component={ScheduledEvents} />
      <Route path="/booking" component={BookingLinks} />
      {/* Legacy route format - maintain backward compatibility */}
      <Route path="/booking/:slug" component={({ params }) => <PublicBookingPage slug={params.slug} />} />
      {/* Public user landing page - shows all event types */}
      <Route path="/:userPath/booking" component={({ params }) => <PublicUserLanding userPath={params.userPath} />} />
      {/* New custom URL format - firstname.lastname/booking/slug */}
      <Route path="/:userPath/booking/:slug" component={({ params }) => <PublicBookingPage slug={params.slug} userPath={params.userPath} />} />
      <Route path="/bookings" component={BookingsManagement} />
      <Route path="/meeting-polls" component={MeetingPolls} />
      <Route path="/poll/:slug" component={({ params }) => <PublicPollPage slug={params.slug} />} />
      <Route path="/route/:slug" component={({ params }) => <PublicRoutingForm slug={params.slug} />} />
      <Route path="/routing" component={RoutingForms} />
      <Route path="/availability" component={Availability} />
      <Route path="/settings" component={Settings} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/workflows" component={Workflows} />
      <Route path="/analytics" component={Analytics} />
      {/* Authentication routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/set-new-password" component={SetNewPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/change-password" component={ForcePasswordChange} />

      {/* New User Management Dashboard */}
      <Route path="/user-management" component={UserManagementDashboard} />
      
      {/* Role-based dashboard routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminDashboard} />
      <Route path="/admin/organizations" component={AdminDashboard} />
      <Route path="/admin/teams" component={AdminDashboard} />
      <Route path="/admin/subscriptions" component={SubscriptionManagement} />
      <Route path="/admin/stripe-products" component={StripeProductsManager} />
      
      <Route path="/organization" component={OrganizationDashboard} />
      <Route path="/organization/teams" component={OrganizationDashboard} />
      <Route path="/organization/members" component={OrganizationDashboard} />
      
      <Route path="/team" component={TeamDashboard} />
      <Route path="/team/members" component={TeamDashboard} />
      <Route path="/team/schedule" component={TeamDashboard} />
      
      {/* Profile page */}
      <Route path="/profile" component={Profile} />
      
      {/* Diagnostic Tools */}
      <Route path="/diagnostic" component={DiagnosticPage} />
      
      {/* Help & Support */}
      <Route path="/help" component={HelpSupport} />
      <Route path="/help/documentation/GettingStartedGuide" component={GettingStartedGuide} />
      <Route path="/help/documentation/ApiDocumentation" component={ApiDocumentation} />
      <Route path="/help/documentation/AdminGuide" component={AdminGuide} />
      <Route path="/help/documentation/KnowledgeBase" component={KnowledgeBase} />
      <Route path="/help/documentation/article/:articleId" component={ArticlePage} />
      <Route path="/help/tutorials/calendar-getting-started" component={CalendarGettingStarted} />
      <Route path="/help/tutorials/booking-links" component={BookingLinksTutorial} />
      <Route path="/help/tutorials/team-scheduling" component={TeamSchedulingTutorial} />
      
      {/* Legal pages */}
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      
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
