// Core types for Aquasentra Ocean Hazard System

export interface User {
  id: string;
  email: string;
  role: 'citizen' | 'verifier' | 'analyst';
  firstName: string;
  lastName: string;
  createdAt: Date;
  lastActive: Date;
}

export interface HazardReport {
  id: string;
  userId: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  hazardType: HazardType;
  severity: SeverityLevel;
  description: string;
  media?: MediaFile[];
  status: ReportStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  verifierId?: string;
  verifiedAt?: Date;
  urgency: UrgencyLevel;
  consentGiven: boolean;
}

export type HazardType = 
  | 'flood'
  | 'high-waves'
  | 'coastal-erosion'
  | 'storm-surge'
  | 'tsunami'
  | 'oil-spill'
  | 'marine-debris'
  | 'red-tide'
  | 'infrastructure-damage'
  | 'other';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type UrgencyLevel = 'routine' | 'urgent' | 'immediate' | 'emergency';
export type ReportStatus = 'pending' | 'verified' | 'rejected' | 'archived';

export interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  uploadedAt: Date;
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'sensor' | 'model' | 'satellite';
  source: string;
  visible: boolean;
  opacity: number;
}

export interface Dashboard {
  totalReports: number;
  pendingReports: number;
  verifiedReports: number;
  criticalReports: number;
  reportsByType: Record<HazardType, number>;
  reportsBySeverity: Record<SeverityLevel, number>;
  recentActivity: HazardReport[];
}

export interface ReportFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  severity?: SeverityLevel[];
  hazardType?: HazardType[];
  status?: ReportStatus[];
  tags?: string[];
}