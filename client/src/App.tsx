import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ScheduledEvents from "@/pages/ScheduledEvents";
import BookingLinks from "@/pages/BookingLinks";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/events" component={ScheduledEvents} />
      <Route path="/booking" component={BookingLinks} />
      <Route path="/settings" component={Settings} />
      {/* Authentication routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* New routes for admin */}
      <Route path="/admin/users" component={() => <div className="p-8">Admin: User Management (to be implemented)</div>} />
      <Route path="/admin/organizations" component={() => <div className="p-8">Admin: Organization Management (to be implemented)</div>} />
      
      {/* New routes for company admin */}
      <Route path="/organization/teams" component={() => <div className="p-8">Company Admin: Team Management (to be implemented)</div>} />
      
      {/* Profile page */}
      <Route path="/profile" component={() => <div className="p-8">User Profile (to be implemented)</div>} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
