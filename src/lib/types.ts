export interface Camera {
  id: number;
  name: string;
  streamUrl: string;
  snapshotUrl: string | null;
  streamType: "hls" | "mjpeg" | "snapshot" | "webrtc";
  username: string | null;
  password: string | null;
  location: string | null;
  isActive: boolean;
  refreshInterval: number;
  recordingEnabled: boolean;
  recordingInterval: number;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  id: number;
  cameraId: number;
  cameraName?: string | null;
  filename: string;
  contentType: string;
  triggerType: "scheduled" | "manual" | "motion";
  fileSize: number | null;
  duration: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface DiscoveredDevice {
  ip: string;
  source: "onvif" | "scan" | "remote";
  host?: string;
  subnet?: string;
  name?: string;
  hardware?: string;
  manufacturer?: string;
  xaddrs?: string[];
  openPorts?: { port: number; label: string }[];
  guessedBrand?: string;
  serverHeader?: string;
  suggestedStreamType: "snapshot" | "mjpeg" | "hls";
  suggestedStreamUrl?: string;
  suggestedSnapshotUrl?: string;
}

export interface DiscoveryResponse {
  devices: DiscoveredDevice[];
  scannedSubnets: string[];
  method: "onvif" | "scan" | "both" | "remote";
}

export interface RecordingStats {
  totalBytes: number;
  totalCount: number;
  perCamera: {
    cameraId: number;
    cameraName: string | null;
    count: number;
    totalBytes: number;
    oldest: string | null;
    newest: string | null;
  }[];
}
