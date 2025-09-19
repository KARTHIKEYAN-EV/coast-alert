import { NavLink, useLocation } from "react-router-dom";
import {
  MapPin,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  Users,
  Settings,
  Home,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  userRole: 'citizen' | 'verifier' | 'analyst';
  pendingReports?: number;
  isCollapsed?: boolean;
}

export const Sidebar = ({ userRole, pendingReports = 0, isCollapsed = false }: SidebarProps) => {
  const location = useLocation();
  
  interface NavItem {
    title: string;
    href: string;
    icon: any;
    roles: ('citizen' | 'verifier' | 'analyst')[];
    badge?: number;
  }

  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { 
        title: "Dashboard", 
        href: "/", 
        icon: Home,
        roles: ['citizen', 'verifier', 'analyst']
      },
      { 
        title: "Map View", 
        href: "/map", 
        icon: MapPin,
        roles: ['citizen', 'verifier', 'analyst']
      },
      { 
        title: "Submit Report", 
        href: "/report", 
        icon: PlusCircle,
        roles: ['citizen', 'verifier', 'analyst']
      },
    ];

    const verifierItems: NavItem[] = [
      { 
        title: "Review Queue", 
        href: "/review", 
        icon: AlertTriangle,
        roles: ['verifier', 'analyst'],
        badge: pendingReports > 0 ? pendingReports : undefined
      },
      { 
        title: "Verified Reports", 
        href: "/verified", 
        icon: CheckCircle,
        roles: ['verifier', 'analyst']
      },
    ];

    const analystItems: NavItem[] = [
      { 
        title: "Analytics", 
        href: "/analytics", 
        icon: BarChart3,
        roles: ['analyst']
      },
      { 
        title: "Export Data", 
        href: "/export", 
        icon: FileText,
        roles: ['analyst']
      },
      { 
        title: "User Management", 
        href: "/users", 
        icon: Users,
        roles: ['analyst']
      },
    ];

    return [...baseItems, ...verifierItems, ...analystItems].filter(item =>
      item.roles.includes(userRole)
    );
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "h-full border-r bg-card transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge 
                      variant={active ? "secondary" : "destructive"} 
                      className="h-5 px-1.5 text-xs"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
        
        <div className="mt-auto pt-4 border-t">
          <NavLink
            to="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              location.pathname === '/settings'
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isCollapsed && "justify-center px-2"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};