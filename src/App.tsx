import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TesterProvider } from "@/hooks/useTesterContext";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import ComingSoon from "./pages/ComingSoon";
import TesterAccess from "./pages/TesterAccess";
import TesterInvite from "./pages/TesterInvite";
import ModelMix from "./pages/ModelMix";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Pricing from "./pages/Pricing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ShadowDashboard from "./pages/ShadowDashboard";
import Admin from "./pages/Admin";
import Waitlist from "./pages/Waitlist";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import { getExecutionMode } from "@/lib/localMode";

const queryClient = new QueryClient();

const App = () => {
  const isLocalMode = getExecutionMode() === "local";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TesterProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ImpersonationBanner />
              <Routes>
                {/* Coming Soon splash - main entry point */}
                <Route path="/" element={isLocalMode ? <ModelMix /> : <ComingSoon />} />
                
                {/* Tester-only access */}
                <Route
                  path="/tester-access"
                  element={isLocalMode ? <Navigate to="/app" replace /> : <TesterAccess />}
                />
                <Route
                  path="/tester-invite"
                  element={isLocalMode ? <Navigate to="/app" replace /> : <TesterInvite />}
                />
                <Route path="/app" element={<ModelMix />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/shadow" element={<ShadowDashboard />} />
                
                {/* Public pages */}
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/help" element={<Help />} />
                
                {/* Hidden for now - redirect to coming soon */}
                <Route path="/auth" element={isLocalMode ? <Navigate to="/app" replace /> : <ComingSoon />} />
                <Route
                  path="/auth/callback"
                  element={isLocalMode ? <Navigate to="/app" replace /> : <AuthCallback />}
                />
                <Route path="/pricing" element={isLocalMode ? <Navigate to="/app" replace /> : <ComingSoon />} />
                <Route path="/waitlist" element={isLocalMode ? <Navigate to="/app" replace /> : <ComingSoon />} />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TesterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
