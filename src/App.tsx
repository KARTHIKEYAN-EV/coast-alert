import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { MapView } from "./pages/MapView";
import { ReportSubmission } from "./pages/ReportSubmission";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Mock user data - will be replaced with real authentication
const mockUser = {
  firstName: "John",
  lastName: "Doe", 
  role: "citizen" as const
};

const App = () => {
  // For demo purposes, we'll show the login page first
  // In production, this would check authentication state
  const isAuthenticated = true; // Change to false to see login page

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {!isAuthenticated ? (
            <Routes>
              <Route path="*" element={<Login />} />
            </Routes>
          ) : (
            <Layout user={mockUser} pendingReports={8}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/report" element={<ReportSubmission />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
