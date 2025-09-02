import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import CameraFeed from './CameraFeed';
import { mockCameraFeeds } from '../utils/mockData';

const Dashboard: React.FC = () => {
  const activeFeeds = mockCameraFeeds.filter(feed => feed.status === 'online').length;
  const alertFeeds = mockCameraFeeds.filter(feed => feed.status === 'alert').length;
  const offlineFeeds = mockCameraFeeds.filter(feed => feed.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

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
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Live Camera Feeds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockCameraFeeds.map((feed) => (
            <CameraFeed key={feed.id} feed={feed} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;