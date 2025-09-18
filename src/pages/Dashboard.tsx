import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, MapPin, TrendingUp, PlusCircle, Clock } from "lucide-react";
import heroImage from "@/assets/ocean-hero.jpg";

// Mock data - will be replaced with real data from Supabase
const mockDashboardData = {
  totalReports: 127,
  pendingReports: 8,
  verifiedReports: 95,
  criticalReports: 3,
  recentReports: [
    {
      id: "1",
      hazardType: "high-waves",
      location: "Santa Monica Beach",
      severity: "high",
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      status: "pending"
    },
    {
      id: "2", 
      hazardType: "coastal-erosion",
      location: "Malibu Coast",
      severity: "medium",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: "verified"
    },
    {
      id: "3",
      hazardType: "storm-surge", 
      location: "Long Beach Harbor",
      severity: "critical",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      status: "verified"
    }
  ]
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return 'text-success border-success';
    case 'medium': return 'text-warning border-warning';
    case 'high': return 'text-severity-high border-severity-high';
    case 'critical': return 'text-severity-critical border-severity-critical';
    default: return 'text-muted-foreground border-border';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-success text-success-foreground';
    case 'pending': return 'bg-warning text-warning-foreground';
    case 'rejected': return 'bg-destructive text-destructive-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const formatHazardType = (type: string) => {
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  } else {
    return `${hours}h ago`;
  }
};

export const Dashboard = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden">
        <img 
          src={heroImage} 
          alt="Ocean hazard monitoring dashboard" 
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-ocean opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-2">Ocean Hazard Monitoring</h1>
            <p className="text-xl opacity-90 mb-6">
              Real-time crowdsourced hazard reporting for coastal safety
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="default" size="lg" className="bg-white text-primary hover:bg-white/90">
                <PlusCircle className="mr-2 h-5 w-5" />
                Submit Report
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                <MapPin className="mr-2 h-5 w-5" />
                View Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDashboardData.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{mockDashboardData.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              Requires verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Reports</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{mockDashboardData.verifiedReports}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{mockDashboardData.criticalReports}</div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Latest hazard reports from the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockDashboardData.recentReports.map((report) => (
              <div 
                key={report.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full border-2 ${getSeverityColor(report.severity)}`} />
                  <div>
                    <p className="font-medium">{formatHazardType(report.hazardType)}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {report.location}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {formatTimeAgo(report.createdAt)}
                  </span>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};