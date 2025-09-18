import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Layers, 
  Filter, 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Maximize2
} from "lucide-react";
import { useState } from "react";

// Mock map data - will be replaced with real map integration
const mockReports = [
  {
    id: "1",
    lat: 34.0194,
    lng: -118.4912,
    hazardType: "high-waves",
    severity: "high",
    status: "verified",
    description: "Dangerous wave conditions observed at Santa Monica Pier"
  },
  {
    id: "2", 
    lat: 34.0259,
    lng: -118.7798,
    hazardType: "coastal-erosion",
    severity: "medium", 
    status: "pending",
    description: "Significant beach erosion noticed along Malibu coastline"
  },
  {
    id: "3",
    lat: 33.7701,
    lng: -118.1937,
    hazardType: "storm-surge",
    severity: "critical",
    status: "verified",
    description: "Storm surge causing flooding in Long Beach harbor area"
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'verified': return <CheckCircle className="h-4 w-4 text-success" />;
    case 'pending': return <Clock className="h-4 w-4 text-warning" />;
    default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
};

export const MapView = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex h-full">
      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Placeholder for actual map integration */}
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 relative overflow-hidden">
          {/* Map Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Interactive Map</h3>
              <p className="text-muted-foreground mb-4">
                Map integration requires backend setup with Supabase
              </p>
              <Button variant="ocean">
                Initialize Map Service
              </Button>
            </div>
          </div>
          
          {/* Mock Report Pins */}
          {mockReports.map((report) => (
            <div
              key={report.id}
              className={`absolute w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${getSeverityColor(report.severity)} hover:scale-110 transition-transform`}
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${30 + Math.random() * 40}%`,
              }}
              onClick={() => setSelectedReport(report.id)}
            />
          ))}
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Button variant="secondary" size="icon">
            <Layers className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="absolute top-4 right-4 left-20">
          <div className="flex gap-2 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search location or report ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="absolute top-20 right-4 w-80 z-10">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Customize map display</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Severity</h4>
                <div className="flex flex-wrap gap-2">
                  {['low', 'medium', 'high', 'critical'].map((severity) => (
                    <Badge 
                      key={severity}
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                    >
                      {severity}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                <div className="flex flex-wrap gap-2">
                  {['verified', 'pending', 'rejected'].map((status) => (
                    <Badge 
                      key={status}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Hazard Types</h4>
                <div className="flex flex-wrap gap-2">
                  {['flood', 'high-waves', 'coastal-erosion', 'storm-surge'].map((type) => (
                    <Badge 
                      key={type}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent text-xs"
                    >
                      {type.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Details Sidebar */}
      <div className="w-80 border-l bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Report Details</h3>
          <p className="text-sm text-muted-foreground">
            Click on a map pin to view details
          </p>
        </div>
        
        <div className="p-4 space-y-4">
          {selectedReport ? (
            <div className="space-y-4">
              {mockReports
                .filter(r => r.id === selectedReport)
                .map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {report.hazardType.replace('-', ' ')}
                        </CardTitle>
                        {getStatusIcon(report.status)}
                      </div>
                      <CardDescription>
                        Report #{report.id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(report.severity)}>
                          {report.severity}
                        </Badge>
                        <Badge variant="outline">
                          {report.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm">{report.description}</p>
                      
                      <div className="text-xs text-muted-foreground">
                        <p>Location: {report.lat.toFixed(4)}, {report.lng.toFixed(4)}</p>
                        <p>Reported: 2 hours ago</p>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Actions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a report on the map to view details</p>
            </div>
          )}
          
          {/* Recent Reports List */}
          <div className="space-y-3">
            <h4 className="font-medium">Recent Reports</h4>
            {mockReports.map((report) => (
              <div
                key={report.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {report.hazardType.replace('-', ' ')}
                  </span>
                  <Badge className={`${getSeverityColor(report.severity)} text-xs`}>
                    {report.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.description.substring(0, 50)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};