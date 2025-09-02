import React, { useState } from 'react';
import { Shield, Flame, MapPin, Camera, Settings } from 'lucide-react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/DashboardNew';
import DetectionTab from './components/DetectionTab';
import FireStationsTab from './components/FireStationsTab';

type Tab = 'dashboard' | 'detection' | 'stations';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update timestamp every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimestamp = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${dayName}, ${day} ${month} ${year}\n${hours}:${minutes}:${seconds}`;
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        const data = await response.json();
        setLoginError(data.detail || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      setLoginError('Unable to connect to the server. Please try again later.');
    }
    setIsLoading(false);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={handleLogin}
        error={loginError}
        isLoading={isLoading}
      />
    );
  }

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: Shield },
    { id: 'detection' as Tab, label: 'Detection', icon: Flame },
    { id: 'stations' as Tab, label: 'Fire Stations', icon: MapPin },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'detection':
        return <DetectionTab />;
      case 'stations':
        return <FireStationsTab />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">FireGuard</h1>
                <p className="text-xs text-gray-400">Smoke & Fire Detection System</p>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-500 text-sm font-medium">System Active</span>
              </div>
            </div>
            
            {/* Navigation Menu */}
            <div className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 transform translate-y-4"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-gray-300 text-sm font-medium whitespace-pre-line">
                  {formatTimestamp(currentTime)}
                </div>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setIsAuthenticated(false);
                        setShowSettings(false);
                      }}
                      className="w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;