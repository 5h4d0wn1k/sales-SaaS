import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessProfile } from "@/hooks/use-business-profile";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Opportunities from "@/pages/Opportunities";
import Clients from "@/pages/Clients";
import Campaigns from "@/pages/Campaigns";
import CustomerSuccess from "@/pages/CustomerSuccess";
import AgenticMode from "@/pages/AgenticMode";
import Subscription from "@/pages/Subscription";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { OnboardingWizard } from "@/components/OnboardingWizard";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: businessProfile, isLoading: profileLoading } = useBusinessProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  const needsOnboarding = !businessProfile?.isOnboarded && !showOnboarding;

  return (
    <Layout>
      {needsOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
      <Component />
    </Layout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {user ? (
          <Layout>
            <Dashboard />
          </Layout>
        ) : (
          <Landing />
        )}
      </Route>

      <Route path="/leads">
        <ProtectedRoute component={Leads} />
      </Route>
      
      <Route path="/opportunities">
        <ProtectedRoute component={Opportunities} />
      </Route>

      <Route path="/clients">
        <ProtectedRoute component={Clients} />
      </Route>

      <Route path="/campaigns">
        <ProtectedRoute component={Campaigns} />
      </Route>

      <Route path="/customer-success">
        <ProtectedRoute component={CustomerSuccess} />
      </Route>
      
      <Route path="/agentic-mode">
        <ProtectedRoute component={AgenticMode} />
      </Route>

      <Route path="/genetic-mode">
        <Redirect to="/agentic-mode" />
      </Route>
      
      <Route path="/subscription">
        <ProtectedRoute component={Subscription} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
