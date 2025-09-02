import { FireStation, CameraFeed, DetectionResult } from '../types';

export const mockFireStations: FireStation[] = [
  {
    id: '1',
    name: 'Central Fire Station',
    address: '123 Main Street, Downtown',
    phone: '+1 (555) 123-4567',
    latitude: 40.7589,
    longitude: -73.9851,
    distance: 0.8,
    status: 'active',
    vehicles: 4,
    personnel: 12
  },
  {
    id: '2',
    name: 'North District Station',
    address: '456 Oak Avenue, North Side',
    phone: '+1 (555) 234-5678',
    latitude: 40.7614,
    longitude: -73.9776,
    distance: 1.2,
    status: 'active',
    vehicles: 3,
    personnel: 8
  },
  {
    id: '3',
    name: 'Harbor Fire Station',
    address: '789 Harbor Drive, Waterfront',
    phone: '+1 (555) 345-6789',
    latitude: 40.7505,
    longitude: -73.9934,
    distance: 2.1,
    status: 'busy',
    vehicles: 5,
    personnel: 15
  },
  {
    id: '4',
    name: 'East Side Station',
    address: '321 Park Boulevard, East Side',
    phone: '+1 (555) 456-7890',
    latitude: 40.7614,
    longitude: -73.9568,
    distance: 2.8,
    status: 'active',
    vehicles: 2,
    personnel: 6
  }
];

export const mockCameraFeeds: CameraFeed[] = [
  {
    id: 'cam-1',
    name: 'Main Entrance',
    location: 'Building A - Floor 1',
    status: 'online',
    lastDetection: undefined
  },
  {
    id: 'cam-2',
    name: 'Storage Room',
    location: 'Building B - Floor 2',
    status: 'alert',
    lastDetection: {
      type: 'smoke',
      confidence: 0.89,
      timestamp: '2025-01-10T10:30:00Z',
      location: 'Storage Room B2-12'
    }
  },
  {
    id: 'cam-3',
    name: 'Parking Garage',
    location: 'Underground Level',
    status: 'online',
    lastDetection: undefined
  },
  {
    id: 'cam-4',
    name: 'Server Room',
    location: 'Building A - Floor 3',
    status: 'offline',
    lastDetection: undefined
  }
];

export const generateMockDetection = (): DetectionResult => {
  const types: Array<'smoke' | 'fire' | 'clear'> = ['smoke', 'fire', 'clear'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  return {
    type: randomType,
    confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
    timestamp: new Date().toISOString(),
    location: 'Uploaded Media'
  };
};