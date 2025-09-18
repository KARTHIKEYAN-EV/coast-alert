import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  Search, 
  Filter,
  MapPin,
  Clock,
  User,
  FileText,
  Download,
  Eye
} from "lucide-react";

// Mock data for verified reports
const mockVerifiedReports = [
  {
    id: "v1",
    description: "Large waves causing flooding in coastal area near marina",
    hazardType: "high-waves",
    severity: "high",
    location: { lat: 34.0194, lng: -118.4912, address: "Santa Monica Pier, CA" },
    submittedBy: "citizen_user_1",
    submittedAt: "2024-01-15T10:30:00Z",
    verifiedBy: "verifier_1",
    verifiedAt: "2024-01-15T11:45:00Z",
    urgency: "urgent",
    hasMedia: true,
    tags: ["flooding", "infrastructure", "urgent"]
  },
  {
    id: "v2", 
    description: "Storm surge flooding downtown waterfront district",
    hazardType: "storm-surge",
    severity: "critical",
    location: { lat: 33.7701, lng: -118.1937, address: "Long Beach Harbor, CA" },
    submittedBy: "citizen_user_3",
    submittedAt: "2024-01-15T06:15:00Z",
    verifiedBy: "verifier_2", 
    verifiedAt: "2024-01-15T07:30:00Z",
    urgency: "emergency",
    hasMedia: true,
    tags: ["storm-surge", "critical", "evacuation"]
  },
  {
    id: "v3",
    description: "Minor coastal erosion observed at beach access point",
    hazardType: "coastal-erosion",
    severity: "low",
    location: { lat: 34.0259, lng: -118.7798, address: "Malibu Beach, CA" },
    submittedBy: "citizen_user_4",
    submittedAt: "2024-01-14T15:20:00Z",
    verifiedBy: "verifier_1",
    verifiedAt: "2024-01-14T16:10:00Z", 
    urgency: "routine",
    hasMedia: false,
    tags: ["erosion", "monitoring"]
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

export const VerifiedReports = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [hazardTypeFilter, setHazardTypeFilter] = useState("all");

  const filteredReports = mockVerifiedReports.filter(report => {
    const matchesSearch = report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.location.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || report.severity === severityFilter;
    const matchesHazardType = hazardTypeFilter === "all" || report.hazardType === hazardTypeFilter;
    
    return matchesSearch && matchesSeverity && matchesHazardType;
  });

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Verified Reports</h1>
          <p className="text-muted-foreground">View and manage all verified hazard reports</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {mockVerifiedReports.length} Verified
          </Badge>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search verified reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={hazardTypeFilter} onValueChange={setHazardTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by hazard type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hazard Types</SelectItem>
                <SelectItem value="high-waves">High Waves</SelectItem>
                <SelectItem value="storm-surge">Storm Surge</SelectItem>
                <SelectItem value="coastal-erosion">Coastal Erosion</SelectItem>
                <SelectItem value="flood">Flood</SelectItem>
                <SelectItem value="tsunami">Tsunami</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
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
                  <CardDescription className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Submitted by {report.submittedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified by {report.verifiedBy}
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
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {report.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button size="sm" variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Map
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No verified reports match your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};