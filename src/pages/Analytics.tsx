import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Filter
} from "lucide-react";

// Mock analytics data
const analyticsData = {
  overview: {
    totalReports: 1247,
    verifiedReports: 1089,
    pendingReports: 158,
    criticalReports: 23,
    averageResponseTime: "2.4 hours"
  },
  trends: {
    reportsThisWeek: 89,
    weeklyChange: "+12%",
    reportsThisMonth: 342,
    monthlyChange: "+8%"
  },
  hazardTypeStats: [
    { type: "High Waves", count: 387, percentage: 31 },
    { type: "Coastal Erosion", count: 298, percentage: 24 },
    { type: "Storm Surge", count: 234, percentage: 19 },
    { type: "Flood", count: 189, percentage: 15 },
    { type: "Marine Debris", count: 139, percentage: 11 }
  ],
  severityDistribution: [
    { level: "Critical", count: 23, color: "bg-severity-critical" },
    { level: "High", count: 156, color: "bg-severity-high" },
    { level: "Medium", count: 478, color: "bg-warning" },
    { level: "Low", count: 590, color: "bg-success" }
  ],
  topLocations: [
    { location: "Santa Monica Bay", reports: 89, trend: "+5%" },
    { location: "Long Beach Harbor", reports: 76, trend: "+12%" },
    { location: "Malibu Coast", reports: 64, trend: "-2%" },
    { location: "Manhattan Beach", reports: 52, trend: "+8%" },
    { location: "Redondo Beach", reports: 45, trend: "+3%" }
  ]
};

export const Analytics = () => {
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor trends and patterns in ocean hazard reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalReports}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.verifiedReports}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((analyticsData.overview.verifiedReports / analyticsData.overview.totalReports) * 100)}% verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.pendingReports}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.criticalReports}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.averageResponseTime}</div>
            <p className="text-xs text-muted-foreground">Time to verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends and Hazard Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly/Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Reporting Trends</CardTitle>
            <CardDescription>Recent activity and growth patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">This Week</p>
                <p className="text-2xl font-bold">{analyticsData.trends.reportsThisWeek}</p>
              </div>
              <Badge variant="secondary">
                {analyticsData.trends.weeklyChange}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold">{analyticsData.trends.reportsThisMonth}</p>
              </div>
              <Badge variant="secondary">
                {analyticsData.trends.monthlyChange}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Hazard Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Hazard Type Distribution</CardTitle>
            <CardDescription>Most common types of reported hazards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.hazardTypeStats.map((hazard, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{hazard.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">{hazard.count}</div>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{width: `${hazard.percentage}%`}}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground w-8">{hazard.percentage}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Severity Distribution and Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Reports categorized by severity level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.severityDistribution.map((severity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${severity.color}`} />
                  <div className="text-sm font-medium">{severity.level}</div>
                </div>
                <div className="text-xl font-bold">{severity.count}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Reporting Locations</CardTitle>
            <CardDescription>Areas with the most hazard reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.topLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">{location.location}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold">{location.reports}</div>
                  <Badge variant={location.trend.startsWith('+') ? 'default' : 'secondary'}>
                    {location.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};