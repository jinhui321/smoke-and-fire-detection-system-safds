import React from 'react';
import { Camera, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { CameraFeed as CameraFeedType } from '../types';

interface CameraFeedProps {
  feed: CameraFeedType;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ feed }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-emerald-500';
      case 'alert':
        return 'text-red-500';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />;
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
        {feed.status === 'offline' ? (
          <div className="text-gray-500 text-center">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Camera Offline</p>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Camera className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-xs text-gray-400">Live Feed</div>
            </div>
          </div>
        )}
        
        {feed.status === 'alert' && (
          <div className="absolute top-2 left-2">
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              ALERT
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium">{feed.name}</h3>
          <div className={`flex items-center gap-1 ${getStatusColor(feed.status)}`}>
            {getStatusIcon(feed.status)}
            <span className="text-xs capitalize">{feed.status}</span>
          </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-3">{feed.location}</p>
        
        {feed.lastDetection && (
          <div className="bg-red-900/50 border border-red-700 rounded p-2">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">
                {feed.lastDetection.type.toUpperCase()} DETECTED
              </span>
            </div>
            <div className="text-xs text-gray-300">
              Confidence: {Math.round(feed.lastDetection.confidence * 100)}%
            </div>
            <div className="text-xs text-gray-400">
              {new Date(feed.lastDetection.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraFeed;