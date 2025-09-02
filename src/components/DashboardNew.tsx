import React, { useState, useEffect } from 'react';
// import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import CameraFeed from './CameraFeed';
import { mockCameraFeeds } from '../utils/mockData';

import { 
  Camera, 
  AlertTriangle, 
  Shield, 
  Thermometer, 
  Wind, 
  Activity, 
  Clock, 
  Users, 
  Phone,
  Settings,
  MapPin,
  Zap,
  Eye,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Navigation,
  Timer,
  Star,
  Building
} from 'lucide-react';

interface DetectionZone {
  id: string;
  name: string;
  status: 'normal' | 'warning' | 'fire' | 'smoke';
  temperature: number;
  airQuality: number;
  lastUpdate: string;
}

interface Alert {
  id: string;
  type: 'fire' | 'smoke' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  zone: string;
  resolved: boolean;
}

interface FireStation {
  id: string;
  name: string;
  address: string;
  distance: number;
  estimatedResponseTime: number;
  status: 'available' | 'busy' | 'responding' | 'offline';
  units: number;
  specialties: string[];
  phone: string;
  rating: number;
}

// export default Dashboard;

function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'maintenance'>('online');
  const [evacuationActive, setEvacuationActive] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  
  const [zones] = useState<DetectionZone[]>([
    {
      id: '1',
      name: 'Main Entrance',
      status: 'normal',
      temperature: 22.5,
      airQuality: 95,
      lastUpdate: '2 seconds ago'
    },
    {
      id: '2',
      name: 'Kitchen Area',
      status: 'warning',
      temperature: 35.2,
      airQuality: 87,
      lastUpdate: '1 second ago'
    },
    {
      id: '3',
      name: 'Server Room',
      status: 'normal',
      temperature: 18.5,
      airQuality: 98,
      lastUpdate: '3 seconds ago'
    },
    {
      id: '4',
      name: 'Storage Area',
      status: 'smoke',
      temperature: 28.7,
      airQuality: 73,
      lastUpdate: 'Just now'
    }
  ]);

  const [alerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'smoke',
      severity: 'high',
      message: 'Smoke detected in Storage Area - Zone 4',
      timestamp: '2 minutes ago',
      zone: 'Storage Area',
      resolved: false
    },
    {
      id: '2',
      type: 'fire',
      severity: 'medium',
      message: 'Temperature spike in Kitchen Area - Zone 2',
      timestamp: '5 minutes ago',
      zone: 'Kitchen Area',
      resolved: false
    },
    {
      id: '3',
      type: 'system',
      severity: 'low',
      message: 'Camera maintenance completed in Zone 1',
      timestamp: '1 hour ago',
      zone: 'Main Entrance',
      resolved: true
    }
  ]);

  const [fireStations] = useState<FireStation[]>([
    {
      id: '1',
      name: 'Central Fire Station 1',
      address: '123 Main Street, Downtown',
      distance: 1.2,
      estimatedResponseTime: 4,
      status: 'available',
      units: 3,
      specialties: ['Fire Suppression', 'Rescue Operations', 'Hazmat'],
      phone: '(555) 123-4567',
      rating: 4.8
    },
    {
      id: '2',
      name: 'North District Station 7',
      address: '456 Oak Avenue, North Side',
      distance: 2.8,
      estimatedResponseTime: 7,
      status: 'available',
      units: 2,
      specialties: ['Fire Suppression', 'Medical Response'],
      phone: '(555) 234-5678',
      rating: 4.6
    },
    {
      id: '3',
      name: 'Industrial Fire Station 12',
      address: '789 Industrial Blvd, East District',
      distance: 3.5,
      estimatedResponseTime: 9,
      status: 'responding',
      units: 4,
      specialties: ['Industrial Fires', 'Chemical Response', 'Heavy Rescue'],
      phone: '(555) 345-6789',
      rating: 4.9
    },
    {
      id: '4',
      name: 'West Side Station 4',
      address: '321 Pine Street, West End',
      distance: 4.1,
      estimatedResponseTime: 11,
      status: 'busy',
      units: 2,
      specialties: ['Fire Suppression', 'Emergency Medical'],
      phone: '(555) 456-7890',
      rating: 4.4
    },
    {
      id: '5',
      name: 'Airport Fire & Rescue',
      address: '999 Airport Way, Terminal Area',
      distance: 5.7,
      estimatedResponseTime: 15,
      status: 'available',
      units: 5,
      specialties: ['Aircraft Rescue', 'Foam Systems', 'Specialized Equipment'],
      phone: '(555) 567-8901',
      rating: 4.7
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'fire': return 'bg-red-600';
      case 'smoke': return 'bg-orange-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'fire': return <XCircle className="w-5 h-5" />;
      case 'smoke': return <AlertTriangle className="w-5 h-5" />;
      default: return <Eye className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-400';
      case 'medium': return 'text-amber-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStationStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-900/20';
      case 'busy': return 'text-amber-400 bg-amber-900/20';
      case 'responding': return 'text-blue-400 bg-blue-900/20';
      case 'offline': return 'text-gray-400 bg-gray-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStationStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'busy': return <Clock className="w-4 h-4" />;
      case 'responding': return <Navigation className="w-4 h-4" />;
      case 'offline': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');
  const availableStations = fireStations.filter(station => station.status === 'available');
  const sortedStations = [...fireStations].sort((a, b) => a.distance - b.distance);

  const handleDispatchStation = (stationId: string) => {
    setSelectedStation(stationId);
    // In a real application, this would trigger the dispatch process
    alert(`Dispatching ${fireStations.find(s => s.id === stationId)?.name} to respond to the emergency.`);
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{activeFeeds}</div>
              <div className="text-gray-400 text-sm">Active Cameras</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{alertFeeds}</div>
              <div className="text-gray-400 text-sm">Active Alerts</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{offlineFeeds}</div>
              <div className="text-gray-400 text-sm">Offline Cameras</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">98.2%</div>
              <div className="text-gray-400 text-sm">System Uptime</div>
            </div>
          </div>
        </div>
      </div> */}

      {/* System Status */}
      {/* <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          System Status
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-emerald-500 font-medium">All Systems Operational</span>
          <span className="text-gray-400 ml-2">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div> */}

      {/* Camera Feeds Grid */}
      {/* <div>
        <h2 className="text-xl font-bold text-white mb-4">Live Camera Feeds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockCameraFeeds.map((feed) => (
            <CameraFeed key={feed.id} feed={feed} />
          ))}
        </div>
      </div> */}
      
      {/* Main Content Container with consistent dark background */}
      <div className="bg-gray-900 min-h-[calc(100vh-80px)]">
        <main className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Camera Feeds */}
            <div className="xl:col-span-2 space-y-6">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Camera className="w-6 h-6 text-blue-400" />
                <span>Live Camera Feeds</span>
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {zones.map((zone) => (
                  <div key={zone.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="relative">
                      {/* Simulated Camera Feed */}
                      <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                        <div className="text-gray-500 text-center">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Camera Feed</p>
                          <p className="text-xs">{zone.name}</p>
                        </div>
                        
                        {/* Status Overlay */}
                        <div className="absolute top-3 left-3">
                          <div className={`flex items-center space-x-2 px-2 py-1 rounded-lg text-xs font-medium ${
                            zone.status === 'normal' ? 'bg-green-900 text-green-300' :
                            zone.status === 'warning' ? 'bg-amber-900 text-amber-300' :
                            zone.status === 'fire' ? 'bg-red-900 text-red-300' :
                            'bg-orange-900 text-orange-300'
                          }`}>
                            {getStatusIcon(zone.status)}
                            <span>{zone.status.toUpperCase()}</span>
                          </div>
                        </div>
                        
                        {/* Live Indicator */}
                        <div className="absolute top-3 right-3 flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-red-400 font-medium">LIVE</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{zone.name}</h3>
                        <span className="text-xs text-gray-400">{zone.lastUpdate}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="w-4 h-4 text-red-400" />
                          <span>{zone.temperature}°C</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Wind className="w-4 h-4 text-blue-400" />
                          <span>{zone.airQuality}% AQ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar - System Status & Fire Stations */}
            <div className="space-y-6">
              {/* System Overview */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Activity className="w-6 h-6 text-green-400" />
                  <span>System Overview</span>
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-gray-400">Active Zones</span>
                    </div>
                    <div className="text-2xl font-bold">{zones.length}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bell className="w-5 h-5 text-amber-400" />
                      <span className="text-sm text-gray-400">Active Alerts</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{activeAlerts.length}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Truck className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-gray-400">Available Units</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">{availableStations.length}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Phone className="w-5 h-5 text-red-400" />
                      <span className="text-sm text-gray-400">Emergency</span>
                    </div>
                    <div className="text-lg font-bold text-red-400">911</div>
                  </div>
                </div>
              </div>

              {/* Fire Stations */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Truck className="w-6 h-6 text-red-400" />
                  <span>Fire Stations</span>
                  <span className="bg-green-600 text-green-100 px-2 py-1 rounded-full text-xs font-medium">
                    {availableStations.length} Available
                  </span>
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sortedStations.map((station) => (
                    <div key={station.id} className={`p-4 rounded-lg border transition-all ${
                      selectedStation === station.id 
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Building className="w-4 h-4 text-gray-400" />
                            <h3 className="font-semibold text-sm">{station.name}</h3>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{station.address}</p>
                          
                          <div className="flex items-center space-x-4 text-xs mb-2">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              <span>{station.distance} km</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Timer className="w-3 h-3 text-amber-400" />
                              <span>{station.estimatedResponseTime} min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-400" />
                              <span>{station.rating}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getStationStatusColor(station.status)}`}>
                              {getStationStatusIcon(station.status)}
                              <span>{station.status.toUpperCase()}</span>
                            </span>
                            <span className="text-xs text-gray-400">{station.units} units</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {station.specialties.slice(0, 2).map((specialty, index) => (
                              <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                {specialty}
                              </span>
                            ))}
                            {station.specialties.length > 2 && (
                              <span className="text-xs text-gray-400">+{station.specialties.length - 2} more</span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Phone className="w-3 h-3" />
                            <span>{station.phone}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {station.status === 'available' && (
                          <button
                            onClick={() => handleDispatchStation(station.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
                          >
                            Dispatch
                          </button>
                        )}
                        <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium py-2 px-3 rounded transition-colors">
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Alerts */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <span>Recent Alerts</span>
                  {activeAlerts.length > 0 && (
                    <span className="bg-amber-600 text-amber-100 px-2 py-1 rounded-full text-xs font-medium">
                      {activeAlerts.length}
                    </span>
                  )}
                </h2>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                      alert.resolved 
                        ? 'bg-gray-900 border-gray-600 opacity-60' 
                        : alert.severity === 'critical' 
                          ? 'bg-red-900/20 border-red-500' 
                          : alert.severity === 'high'
                            ? 'bg-orange-900/20 border-orange-500'
                            : alert.severity === 'medium'
                              ? 'bg-amber-900/20 border-amber-500'
                              : 'bg-blue-900/20 border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-xs font-medium uppercase tracking-wide ${getSeverityColor(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            {alert.resolved && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-green-400">RESOLVED</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1">{alert.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>{alert.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Emergency Evacuation Overlay */}
      {evacuationActive && (
        <div className="fixed inset-0 bg-red-600/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white text-red-900 p-8 rounded-lg max-w-md w-full mx-4 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold mb-4">EVACUATION ACTIVE</h2>
            <p className="mb-6">Please evacuate the building immediately. Follow emergency procedures and gather at the designated assembly point.</p>
            <button
              onClick={() => setEvacuationActive(false)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Acknowledge & Deactivate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;