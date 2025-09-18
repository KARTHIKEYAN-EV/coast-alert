import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Search, 
  Filter,
  MapPin,
  Clock,
  User,
  FileText
} from "lucide-react";

// Mock data for review queue
const mockPendingReports = [
  {
    id: "1",
    description: "Large waves causing flooding in coastal area near marina",
    hazardType: "high-waves",
    severity: "high",
    location: { lat: 34.0194, lng: -118.4912, address: "Santa Monica Pier, CA" },
    submittedBy: "citizen_user_1",
    submittedAt: "2024-01-15T10:30:00Z",
    urgency: "urgent",
    hasMedia: true
  },
  {
    id: "2", 
    description: "Coastal erosion accelerating, infrastructure at risk",
    hazardType: "coastal-erosion",
    severity: "medium",
    location: { lat: 34.0259, lng: -118.7798, address: "Malibu Beach, CA" },
    submittedBy: "citizen_user_2", 
    submittedAt: "2024-01-15T08:45:00Z",
    urgency: "routine",
    hasMedia: false
  },
  {
    id: "3",
    description: "Storm surge flooding downtown waterfront district",
    hazardType: "storm-surge", 
    severity: "critical",
    location: { lat: 33.7701, lng: -118.1937, address: "Long Beach Harbor, CA" },
    submittedBy: "citizen_user_3",
    submittedAt: "2024-01-15T06:15:00Z", 
    urgency: "emergency",
    hasMedia: true
  }
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return 'bg-success';
    case 'medium': return 'bg-warning';
    case 'high': return 'bg-severity-high';
    case 'critical': return 'bg-severity-critical';
    default: return 'bg-muted';
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'routine': return 'default';
    case 'urgent': return 'secondary';
    case 'immediate': return 'destructive';
    case 'emergency': return 'destructive';
    default: return 'outline';
  }
};

export const ReviewQueue = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handleVerify = (reportId: string) => {
    console.log("Verifying report:", reportId);
    // TODO: API call to verify report
  };

  const handleReject = (reportId: string) => {
    console.log("Rejecting report:", reportId);
    // TODO: API call to reject report
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Review Queue</h1>
          <p className="text-muted-foreground">Review and moderate submitted hazard reports</p>
        </div>
        <Badge variant="destructive" className="text-lg px-3 py-1">
          {mockPendingReports.length} Pending
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports by description, location, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Review Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({mockPendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Recently Verified (0)
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Recently Rejected (0)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {mockPendingReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {report.hazardType.replace('-', ' ')}
                      </CardTitle>
                      <Badge className={getSeverityColor(report.severity)}>
                        {report.severity}
                      </Badge>
                      <Badge variant={getUrgencyColor(report.urgency)}>
                        {report.urgency}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {report.submittedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(report.submittedAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {report.location.address}
                      </span>
                      {report.hasMedia && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Media attached
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{report.description}</p>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ocean"
                    onClick={() => handleVerify(report.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleReject(report.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    View on Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
              <p className="text-muted-foreground">No recently verified reports</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-muted-foreground">No recently rejected reports</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};