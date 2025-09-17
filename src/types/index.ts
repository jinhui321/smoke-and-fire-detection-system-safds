export interface FireStation {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance: number;
  status: 'active' | 'busy' | 'maintenance';
  vehicles: number;
  personnel: number;
}

export interface DetectionResult {
  type: 'smoke' | 'fire' | 'fire_and_smoke' | 'clear';
  confidence: number;
  timestamp: string;
  location?: string;
  preprocess_ms?: number;
  inference_ms?: number;
  postprocess_ms?: number;
  shape?: number[];
  detections?: Array<{
    class: string;
    confidence: number;
  }>;
  result_url?: string;
}

export interface VideoProcessingResult {
  type: 'video_uploaded';
  video_path: string;
  timestamp: string;
  message: string;
  annotated_video_url?: string;
}

export interface ProcessedFrame {
  frame: string; // base64 encoded image
  detections: Array<{
    class: string;
    confidence: number;
    bbox?: number[];
  }>;
  timestamp: number;
}

export interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'alert';
  lastDetection?: DetectionResult;
}