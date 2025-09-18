import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  user?: {
    firstName: string;
    lastName: string;
    role: 'citizen' | 'verifier' | 'analyst';
  };
  pendingReports?: number;
}

export const Layout = ({ children, user, pendingReports = 0 }: LayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      {user && (
        <Sidebar 
          userRole={user.role} 
          pendingReports={pendingReports}
          isCollapsed={sidebarCollapsed}
        />
      )}
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header 
          user={user}
          pendingReports={pendingReports}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};