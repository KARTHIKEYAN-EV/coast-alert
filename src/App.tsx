import { useState } from "react";

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
import { Settings } from "./pages/Settings";
import { ReviewQueue } from "./pages/ReviewQueue";
import { VerifiedReports } from "./pages/VerifiedReports";
import { Analytics } from "./pages/Analytics";
import { UserManagement } from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Mock user data - will be replaced with real authentication
const mockUsers = {
  citizen: {
    firstName: "John",
    lastName: "Doe",
    role: "citizen" as const,
  },
  verifier: {
    firstName: "Jane",
    lastName: "Smith",
    role: "verifier" as const,
  },
  analyst: {
    firstName: "Mike",
    lastName: "Johnson",
    role: "analyst" as const,
  },
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Start with false to show login
  const [currentUser, setCurrentUser] = useState<{
    firstName: string;
    lastName: string;
    role: "citizen" | "verifier" | "analyst";
  } | null>(null);

  const handleLogin = (
    role: "citizen" | "verifier" | "analyst" = "citizen"
  ) => {
    setCurrentUser(mockUsers[role]);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {!isAuthenticated ? (
            <Routes>
              <Route path="*" element={<Login onLogin={handleLogin} />} />
            </Routes>
          ) : (
            <Layout
              user={currentUser!}
              pendingReports={8}
              onLogout={handleLogout}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/report" element={<ReportSubmission />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/review"
                  element={
                    currentUser?.role === "verifier" ||
                    currentUser?.role === "analyst" ? (
                      <ReviewQueue />
                    ) : (
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-muted-foreground">
                          Access Denied
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This page is only available to Verifiers and Analysts.
                        </p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/verified"
                  element={
                    currentUser?.role === "verifier" ||
                    currentUser?.role === "analyst" ? (
                      <VerifiedReports />
                    ) : (
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-muted-foreground">
                          Access Denied
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This page is only available to Verifiers and Analysts.
                        </p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    currentUser?.role === "analyst" ? (
                      <Analytics />
                    ) : (
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-muted-foreground">
                          Access Denied
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This page is only available to Analysts.
                        </p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/users"
                  element={
                    currentUser?.role === "analyst" ? (
                      <UserManagement />
                    ) : (
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-muted-foreground">
                          Access Denied
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This page is only available to Analysts.
                        </p>
                      </div>
                    )
                  }
                />
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
