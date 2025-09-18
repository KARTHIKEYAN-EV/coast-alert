import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Camera, 
  Video, 
  AlertTriangle, 
  Upload,
  Crosshair,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const hazardTypes = [
  { id: 'flood', label: 'Flooding', icon: '🌊' },
  { id: 'high-waves', label: 'High Waves', icon: '🌊' },
  { id: 'coastal-erosion', label: 'Coastal Erosion', icon: '🏖️' },
  { id: 'storm-surge', label: 'Storm Surge', icon: '⛈️' },
  { id: 'tsunami', label: 'Tsunami', icon: '🌊' },
  { id: 'oil-spill', label: 'Oil Spill', icon: '🛢️' },
  { id: 'marine-debris', label: 'Marine Debris', icon: '🗑️' },
  { id: 'red-tide', label: 'Red Tide', icon: '🔴' },
  { id: 'infrastructure-damage', label: 'Infrastructure Damage', icon: '🏗️' },
  { id: 'other', label: 'Other', icon: '❓' },
];

const severityLevels = [
  { id: 'low', label: 'Low', color: 'text-success border-success', description: 'Minor concern, no immediate danger' },
  { id: 'medium', label: 'Medium', color: 'text-warning border-warning', description: 'Moderate impact, caution advised' },
  { id: 'high', label: 'High', color: 'text-severity-high border-severity-high', description: 'Significant impact, urgent attention needed' },
  { id: 'critical', label: 'Critical', color: 'text-severity-critical border-severity-critical', description: 'Extreme danger, immediate response required' },
];

export const ReportSubmission = () => {
  const [formData, setFormData] = useState({
    hazardType: '',
    severity: '',
    description: '',
    location: { lat: null, lng: null, address: '' },
    consent: false,
    urgency: 'routine'
  });
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const detectLocation = () => {
    setIsLocating(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
            }
          }));
          setLocationDetected(true);
          setIsLocating(false);
        },
        (error) => {
          console.error('Location error:', error);
          setIsLocating(false);
        }
      );
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Report submission:', formData, uploadedFiles);
    // This will connect to Supabase backend
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Submit Hazard Report</h1>
        <p className="text-muted-foreground">
          Help keep our coastal communities safe by reporting ocean hazards
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            <CardDescription>
              Where is the hazard located? Precise location helps emergency responders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={detectLocation}
                disabled={isLocating}
                variant={locationDetected ? "success" : "outline"}
                className="flex items-center gap-2"
              >
                {isLocating ? (
                  <>
                    <Crosshair className="h-4 w-4 animate-spin" />
                    Detecting...
                  </>
                ) : locationDetected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Location Detected
                  </>
                ) : (
                  <>
                    <Crosshair className="h-4 w-4" />
                    Auto-Detect Location
                  </>
                )}
              </Button>
              <Button type="button" variant="outline">
                Select on Map
              </Button>
            </div>
            
            {formData.location.address && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Current Location:</p>
                <p className="text-sm text-muted-foreground">{formData.location.address}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="address">Address or Description</Label>
              <Input
                id="address"
                placeholder="e.g., Santa Monica Pier, Section 5"
                value={formData.location.address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, address: e.target.value }
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Hazard Type */}
        <Card>
          <CardHeader>
            <CardTitle>Hazard Type</CardTitle>
            <CardDescription>
              What type of ocean hazard are you reporting?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {hazardTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hazardType: type.id }))}
                  className={cn(
                    "p-3 border rounded-lg text-center transition-colors hover:bg-accent",
                    formData.hazardType === type.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  )}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Level</CardTitle>
            <CardDescription>
              How severe is this hazard? This helps prioritize emergency response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {severityLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, severity: level.id }))}
                  className={cn(
                    "p-4 border rounded-lg text-left transition-colors hover:bg-accent",
                    formData.severity === level.id
                      ? `border-current ${level.color} bg-current/10`
                      : "border-border"
                  )}
                >
                  <div className="font-medium mb-1">{level.label}</div>
                  <div className="text-xs text-muted-foreground">{level.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>
              Provide details about what you observed. Include time, conditions, and any immediate dangers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Describe what you observed... (e.g., Large waves breaking over seawall, debris scattered on beach, water level rising rapidly)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-32"
              required
            />
          </CardContent>
        </Card>

        {/* Media Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos & Videos
            </CardTitle>
            <CardDescription>
              Visual evidence helps verify reports and assess conditions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Click to upload photos or videos</p>
                  <p className="text-sm text-muted-foreground">
                    Max 10MB per file. Images and videos only.
                  </p>
                </div>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded Files:</p>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? (
                        <Camera className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consent */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent"
                checked={formData.consent}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, consent: !!checked }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="consent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Privacy Consent
                </Label>
                <p className="text-xs text-muted-foreground">
                  I consent to sharing my location data and uploaded media for emergency response purposes. 
                  Personal information will be kept confidential and used only for hazard monitoring.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={!formData.hazardType || !formData.severity || !formData.description || !formData.consent}
            className="flex-1"
            variant="ocean"
          >
            Submit Report
          </Button>
          <Button type="button" variant="outline">
            Save Draft
          </Button>
        </div>
      </form>
    </div>
  );
};