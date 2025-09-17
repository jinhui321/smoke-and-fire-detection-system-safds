import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Phone, Clock, Navigation, AlertCircle, Loader, Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Types
interface FireStationData {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description?: string;
  phoneNumber: string;
}

interface UserLocation {
  lat: number;
  lng: number;
}

type FireStationWithDistance = FireStationData & {
  distance: number;
  travelTime: number;
};

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get user's current location
const getCurrentLocation = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        let errorMessage = 'Unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
};

// Parse KML file
const loadKMLFile = async (): Promise<FireStationData[]> => {
  try {
    const response = await fetch('/MalaysiaFireStationsMap.kml');
    const kmlText = await response.text();
    
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    
    const placemarks = kmlDoc.getElementsByTagName('Placemark');
    const fireStations: FireStationData[] = [];
    
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const nameElement = placemark.getElementsByTagName('name')[0];
      const descriptionElement = placemark.getElementsByTagName('description')[0];
      const coordinatesElement = placemark.getElementsByTagName('coordinates')[0];
      
      if (nameElement && coordinatesElement) {
        const name = nameElement.textContent || '';
        const description = descriptionElement?.textContent || '';
        const coordsText = coordinatesElement.textContent?.trim() || '';
        
        // Extract phone number from description
        const phoneRegex = /\+60[\s\d-]+/g;
        const phoneMatch = description.match(phoneRegex);
        const phoneNumber = phoneMatch ? phoneMatch[0].replace(/\s/g, '') : '999';
        
        // Parse coordinates (format: longitude,latitude,altitude)
        const coords = coordsText.split(',');
        if (coords.length >= 2) {
          const lng = parseFloat(coords[0]);
          const lat = parseFloat(coords[1]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            fireStations.push({
              id: `station-${i}`,
              name: name,
              coordinates: { lat, lng },
              description: description,
              phoneNumber
            });
          }
        }
      }
    }
    
    return fireStations;
  } catch (error) {
    console.error('Error loading KML file:', error);
    throw new Error('Failed to load fire station data');
  }
};

// Get nearest locations using Haversine formula
const getNearestLocations = (
  userLocation: UserLocation,
  stations: FireStationData[],
  count: number = 5
): FireStationWithDistance[] => {
  const stationsWithDistance = stations.map(station => {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      station.coordinates.lat,
      station.coordinates.lng
    );
    
    // Estimate travel time (assuming average speed of 50 km/h)
    const travelTime = Math.round((distance / 50) * 60);
    
    return {
      ...station,
      distance,
      travelTime
    };
  });
  
  // Sort by distance and return top N
  return stationsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
};

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

const fireStationYellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
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
  const [showAllStations, setShowAllStations] = useState(false);

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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Fire Stations Map
                {locationError && (
                  <span className="text-xs text-yellow-400 ml-2">({locationError})</span>
                )}
              </h2>
              {userLocation && (
                <span className="text-sm text-gray-400">
                  Current location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              )}
            </div>
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
              {fireStations.map((station) => {
                const isNearestFive = nearestStations.some(ns => ns.id === station.id);
                
                // Only show nearest 5 by default, or all stations when toggle is on
                if (!showAllStations && !isNearestFive) {
                  return null;
                }
                
                return (
                  <Marker
                    key={station.id}
                    position={[station.coordinates.lat, station.coordinates.lng]}
                    icon={isNearestFive ? fireStationIcon : fireStationYellowIcon}
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
                      <div className="text-xs text-gray-600 mb-2">
                        <div>Phone: {station.phoneNumber}</div>
                      </div>
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
                );
              })}
              
              {/* Recenter Button */}
                <RecenterButton userLocation={userLocation} />
                
                {/* Toggle Button for All Stations */}
                <div className="absolute bottom-4 left-4 z-[1000]">
                  <button
                    onClick={() => setShowAllStations(!showAllStations)}
                    className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all duration-200 ${
                      showAllStations
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {showAllStations ? 'Hide Other Stations' : 'Show All Stations'}
                  </button>
                </div>
              </MapContainer>
          </div>
        </div>
      </div>

      {/* Stations List & Details */}
      <div className="space-y-6">
        {/* Station List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                {userLocation ? 'Top 5 Nearest Stations' : 'Fire Stations'}
              </h3>
              {userLocation && (
                <span className="text-sm text-gray-400">
                  Based on current location
                </span>
              )}
            </div>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {userLocation && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                          {index + 1}
                        </span>
                      )}
                      <h4 className="text-white font-medium">
                        {station.name}
                      </h4>
                    </div>
                    
                    {userLocation && (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <span>{station.distance.toFixed(2)} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>~{station.travelTime} min</span>
                        </div>
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
              <h3 className="text-lg font-medium text-white">Fire Station Details</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">{selectedStation.name}</h4>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-300 text-sm font-medium">
                        Lat: {selectedStation.coordinates.lat.toFixed(4)}, 
                        Lng: {selectedStation.coordinates.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-300 text-sm font-medium">
                        Contact: {selectedStation.phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedStation.description && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Description: {selectedStation.description}</p>
                    </div>
                  </div>
                )}

                {userLocation && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <Navigation className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Distance: {selectedStation.distance.toFixed(2)} km</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Est Time: ~{selectedStation.travelTime} min</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-700">
                <button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    if (selectedStation.phoneNumber) {
                      window.location.href = `tel:${selectedStation.phoneNumber}`;
                    } else {
                      alert('Phone number not available for this fire station.');
                    }
                  }}
                >
                  Call Fire Station
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