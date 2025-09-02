import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Phone, Users, Truck, Clock, Navigation, MapPinIcon, AlertCircle, Loader, Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FireStation } from '../types';
import { FireStationData, loadKMLFile } from '../utils/kmlParser';
import { getCurrentLocation, UserLocation } from '../utils/geolocation';
import { getNearestLocations } from '../utils/distanceCalculator';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const fireStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type FireStationWithDistance = FireStationData & {
  distance: number;
  travelTime: number;
};

// Recenter Button Component
interface RecenterButtonProps {
  userLocation: UserLocation | null;
}

const RecenterButton: React.FC<RecenterButtonProps> = ({ userLocation }) => {
  const map = useMap();

  const handleRecenter = () => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 13, {
        animate: true,
        duration: 1
      });
    }
  };

  if (!userLocation) return null;

  return (
    <button
      onClick={handleRecenter}
      className="absolute bottom-4 right-4 z-[1000] bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
      title="Recenter to your location"
    >
      <Crosshair className="w-5 h-5" />
    </button>
  );
};

const FireStationsTab: React.FC = () => {
  const [fireStations, setFireStations] = useState<FireStationData[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearestStations, setNearestStations] = useState<FireStationWithDistance[]>([]);
  const [selectedStation, setSelectedStation] = useState<FireStationWithDistance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Load fire stations from KML
        const stations = await loadKMLFile();
        setFireStations(stations);
        
        // Get user location
        try {
          const location = await getCurrentLocation();
          setUserLocation(location);
          
          // Calculate nearest stations
          const nearest = getNearestLocations(location, stations, 5);
          setNearestStations(nearest);
          setSelectedStation(nearest[0] || null);
          
        } catch (geoError: any) {
          setLocationError(geoError.message);
          // Still show all stations even without user location
          const allStationsWithDistance = stations.map(station => ({
            ...station,
            distance: 0,
            travelTime: 0
          }));
          setNearestStations(allStationsWithDistance.slice(0, 5));
          setSelectedStation(allStationsWithDistance[0] || null);
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load fire station data');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleStationSelect = (station: FireStationWithDistance) => {
    setSelectedStation(station);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading fire stations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Error loading fire stations</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Section */}
      <div className="lg:col-span-2">
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Fire Stations Map
              {locationError && (
                <span className="text-xs text-yellow-400 ml-2">({locationError})</span>
              )}
            </h2>
            {userLocation && (
              <p className="text-sm text-gray-400 mt-1">
                Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            )}
          </div>
          
          <div className="relative h-[520px] bg-gray-900">
            <MapContainer
              center={userLocation ? [userLocation.lat, userLocation.lng] : [3.1390, 101.6869]} // Default to KL
              zoom={userLocation ? 12 : 6}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* User Location Marker */}
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Fire Station Markers */}
              {fireStations.map((station) => (
                <Marker
                  key={station.id}
                  position={[station.coordinates.lat, station.coordinates.lng]}
                  icon={fireStationIcon}
                  eventHandlers={{
                    click: () => {
                      const stationWithDistance = nearestStations.find(s => s.id === station.id) || {
                        ...station,
                        distance: 0,
                        travelTime: 0
                      };
                      handleStationSelect(stationWithDistance);
                    }
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-sm mb-2">{station.name}</h3>
                      {userLocation && (
                        <div className="text-xs text-gray-600 mb-2">
                          <div>Distance: {nearestStations.find(s => s.id === station.id)?.distance.toFixed(2) || 'N/A'} km</div>
                          <div>Est. Time: ~{nearestStations.find(s => s.id === station.id)?.travelTime || 'N/A'} min</div>
                        </div>
                      )}
                      {station.description && (
                        <p className="text-xs text-gray-700">{station.description}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Recenter Button */}
              <RecenterButton userLocation={userLocation} />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Stations List & Details */}
      <div className="space-y-6">
        {/* Station List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">
              {userLocation ? 'Top 5 Nearest Stations' : 'Fire Stations'}
            </h3>
            {userLocation && (
              <p className="text-sm text-gray-400 mt-1">
                Based on your current location
              </p>
            )}
          </div>
          
          <div className="p-4 space-y-3">
            {nearestStations.length > 0 ? (
              nearestStations.map((station, index) => (
                <div
                  key={station.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedStation?.id === station.id
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => handleStationSelect(station)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{station.name}</h4>
                    {userLocation && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {userLocation ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          <span>{station.distance.toFixed(2)} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>~{station.travelTime} min</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Location available</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No fire stations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Station Details */}
        {selectedStation && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Station Details</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">{selectedStation.name}</h4>
                {userLocation && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-300">Fire Station</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-300 text-sm">
                      Lat: {selectedStation.coordinates.lat.toFixed(4)}, 
                      Lng: {selectedStation.coordinates.lng.toFixed(4)}
                    </p>
                    {userLocation && (
                      <p className="text-gray-500 text-xs">{selectedStation.distance.toFixed(2)} km away</p>
                    )}
                  </div>
                </div>

                {selectedStation.description && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-gray-300 text-sm">{selectedStation.description}</p>
                  </div>
                )}

                {userLocation && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-white text-sm font-medium">{selectedStation.distance.toFixed(2)} km</p>
                        <p className="text-gray-500 text-xs">Distance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-white text-sm font-medium">~{selectedStation.travelTime} min</p>
                        <p className="text-gray-500 text-xs">Est. Time</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-700">
                <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                  Call Emergency Services
                </button>
                {userLocation && (
                  <button 
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${selectedStation.coordinates.lat},${selectedStation.coordinates.lng}`;
                      window.open(url, '_blank');
                    }}
                  >
                    Get Directions
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FireStationsTab;