import React, { useState, useEffect } from 'react';

import { 
  Camera, 
  AlertTriangle, 
  Activity, 
  Phone,
  MapPin,
  Eye,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  Timer,
  Building,
} from 'lucide-react';

interface DetectionZone {
  id: string;
  name: string;
  status: 'normal' | 'warning' | 'fire' | 'smoke';
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
  longitude: number;
  latitude: number;
  distance: number;
  estimatedResponseTime: number;
  phone: string;
}

// export default Dashboard;

function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [evacuationActive, setEvacuationActive] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [soundDetected, setSoundDetected] = useState(false);
  
  const [zones, setZones] = useState<DetectionZone[]>([
    {
      id: '1',
      name: 'Bukit Jalil Zone 1',
      status: 'normal',
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: '2',
      name: 'Bukit Jalil Zone 2',
      status: 'fire',
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: '3',
      name: 'Bukit Jalil Zone 3',
      status: 'normal',
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: '4',
      name: 'Bukit Jalil Zone 4',
      status: 'normal',
      lastUpdate: new Date().toLocaleTimeString()
    }
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'fire',
      severity: 'high',
      message: 'Fire detected in Bukit Jalil - Zone 2',
      timestamp: '2 minutes ago',
      zone: 'Storage Area',
      resolved: false
    },
    {
      id: '2',
      type: 'smoke',
      severity: 'medium',
      message: 'Smoke detected in Bukit Jalil - Zone 4',
      timestamp: '1 day ago',
      zone: 'Kitchen Area',
      resolved: true
    },
    {
      id: '3',
      type: 'system',
      severity: 'low',
      message: 'Camera maintenance in Bukit Jalil - Zone 3',
      timestamp: '2 days ago',
      zone: 'Main Entrance',
      resolved: true
    }
  ]);

  const [fireStations] = useState<FireStation[]>([
    {
      id: '1',
      name: 'Bandar Tun Razak Fire and Rescue Station',
      longitude: 101.7218,
      latitude: 3.0899,
      distance: 1.06,
      estimatedResponseTime: ~5,
      phone: '+60 3-9131 2440'
    },
    {
      id: '2',
      name: 'Pasukan Bomba Sukarela',
      longitude: 101.6957,
      latitude: 3.0810,
      distance: 2.73,
      estimatedResponseTime: ~7,
      phone: '999'
    },
    {
      id: '3',
      name: 'Sungai Besi Fire and Rescue Station',
      longitude: 101.7118,
      latitude: 3.0646,
      distance: 3.54,
      estimatedResponseTime: 9,
      phone: '999'
    },
    {
      id: '4',
      name: 'Central Fire and Rescue Station',
      longitude: 101.7048,
      latitude: 3.1378,
      distance: 3.86,
      estimatedResponseTime: 11,
      phone: '999'
    },
    {
      id: '5',
      name: 'Pasukan Bomba Sukarela',
      longitude: 101.7617,
      latitude: 3.1478,
      distance: 4.75,
      estimatedResponseTime: 13,
      phone: '999'
     }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateZoneTimestamps = () => {
      setZones(prevZones => 
        prevZones.map(zone => ({
          ...zone,
          lastUpdate: new Date().toLocaleTimeString()
        }))
      );
    };

    const timer = setInterval(updateZoneTimestamps, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let animationFrame: number;

    const initAudioAnalysis = async () => {
      try {
        const videoElement = document.querySelector('video[src*="processed_video.mp4"]') as HTMLVideoElement;
        if (!videoElement) return;

        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(videoElement);
        analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        const checkAudioLevel = () => {
          if (!analyser || !dataArray) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          
          // Detect sound if average volume is above threshold
          setSoundDetected(average > 10);
          
          animationFrame = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      } catch (error) {
        console.log('Audio analysis not available:', error);
        // Simulate sound detection for demo purposes
        const simulateSound = () => {
          setSoundDetected(Math.random() > 0.7);
        };
        const interval = setInterval(simulateSound, 2000);
        return () => clearInterval(interval);
      }
    };

    const timer = setTimeout(initAudioAnalysis, 1000);

    return () => {
      clearTimeout(timer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext) audioContext.close();
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <XCircle  className="w-5 h-5" />;
      case 'fire': return <AlertTriangle className="w-5 h-5" />;
      case 'smoke': return <AlertCircle  className="w-5 h-5" />;
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

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  };

  return (
    <div className="space-y-2">
      {/* Main Content Container with consistent dark background */}
      <div className="bg-gray-900 min-h-[calc(100vh-80px)]">
        <main className="p-2">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Camera Feeds */}
            <div className="xl:col-span-2 space-y-3">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Camera className="w-6 h-6 text-blue-400" />
                <span className='text-white'>Live Camera Feeds</span>
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {zones.map((zone) => (
                  <div key={zone.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="relative">
                      {/* Video Camera Feed */}
                      <div className={`aspect-video bg-gray-900 flex items-center justify-center relative ${
                        zone.id === '2' && soundDetected ? 'border-4 border-red-500 animate-pulse' : ''
                      }`}>
                        <video 
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          src={zone.id === '1' ? '/processed_videos/normal_hevc.mp4' : 
                               zone.id === '2' ? '/processed_videos/processed_fire_video_with_alarm.mp4' :
                               zone.id === '3' ? '/processed_videos/normal2.mp4' :
                               '/processed_videos/normal3.mp4'}
                        />
                        
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
                        <h3 className="font-semibold text-gray-300">{zone.name}</h3>
                        <span className="text-xs text-gray-400">{zone.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar - System Status & Fire Stations */}
            <div className="space-y-2">
              {/* System Overview */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h2 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Activity className="w-6 h-6 text-green-400" />
                  <span className='text-white'>System Overview</span>
                </h2>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-medium text-gray-400">Active Zones</span>
                    </div>
                    <div className="text-xl font-bold text-blue-400">{zones.length}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bell className="w-5 h-5 text-amber-400" />
                      <span className="text-sm text-gray-400">Active Alerts</span>
                    </div>
                    <div className="text-xl font-bold text-amber-400">{activeAlerts.length}</div>
                  </div>
                </div>
              </div>

              {/* Fire Stations */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h2 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Building className="w-6 h-6 text-red-400" />
                  <span className='text-white'>Fire Stations</span>
                  <span className="bg-green-600 text-green-100 px-2 py-1 rounded-full text-xs font-medium">
                    {fireStations.length} Nearest Available
                  </span>
                </h2>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fireStations.map((station) => (
                    <div key={station.id} className={`p-3 rounded-lg border transition-all ${
                      selectedStation === station.id 
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <h3 className="font-semibold text-sm text-white">{station.name}</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-xs mb-1">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              <span className='text-white'>Lat: {station.latitude.toFixed(4)}, Lng: {station.longitude.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Navigation className="w-3 h-3 text-blue-400" />
                              <span className='text-white'>{station.distance} km</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Timer className="w-3 h-3 text-amber-400" />
                              <span className='text-white'>{station.estimatedResponseTime} min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-amber-400" />
                              <span className='text-white'>{station.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-2">
                        <button className="flex-1 bg-red-700 hover:bg-gray-600 text-white text-xs font-medium py-2 px-3 rounded transition-colors">
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Alerts */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h2 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <span className='text-white'>Recent Alerts</span>
                  {activeAlerts.length > 0 && (
                    <span className="bg-amber-600 text-amber-100 px-2 py-1 rounded-full text-xs font-medium">
                      {activeAlerts.length}
                    </span>
                  )}
                </h2>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
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
                          <p className="text-white text-sm font-medium mb-1">{alert.message}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <span>{alert.timestamp}</span>
                            </div>
                            {alert.severity === 'high' && !alert.resolved && (
                              <button
                                onClick={() => acknowledgeAlert(alert.id)}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors"
                              >
                                Acknowledge
                              </button>
                            )}
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