import { parseString } from 'xml2js';

export interface FireStationData {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description?: string;
}

export const parseKMLFile = async (kmlContent: string): Promise<FireStationData[]> => {
  return new Promise((resolve, reject) => {
    const options = {
      explicitArray: true,
      ignoreAttrs: false,
      trim: true
    };
    
    parseString(kmlContent, options, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const fireStations: FireStationData[] = [];
        
        // Handle different KML structures
        let placemarks: any[] = [];
        
        if (result.kml && result.kml.Document && result.kml.Document[0]) {
          placemarks = result.kml.Document[0].Placemark || [];
        } else if (result.kml && result.kml.Placemark) {
          placemarks = result.kml.Placemark;
        }
        
        placemarks.forEach((placemark: any, index: number) => {
          const name = placemark.name?.[0] || `Fire Station ${index + 1}`;
          const description = placemark.description?.[0] || '';
          
          // Extract coordinates from Point geometry
          if (placemark.Point && placemark.Point[0] && placemark.Point[0].coordinates) {
            const coordString = placemark.Point[0].coordinates[0].trim();
            const coords = coordString.split(',');
            
            if (coords.length >= 2) {
              const lng = parseFloat(coords[0]);
              const lat = parseFloat(coords[1]);
              
              if (!isNaN(lat) && !isNaN(lng)) {
                fireStations.push({
                  id: `station-${index}`,
                  name: name.trim(),
                  coordinates: { lat, lng },
                  description: description.trim()
                });
              }
            }
          }
        });
        
        resolve(fireStations);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
};

// Fallback fire station data for Malaysia
const fallbackFireStations: FireStationData[] = [
  {
    id: 'station-1',
    name: 'Kuala Lumpur Fire Station',
    coordinates: { lat: 3.1390, lng: 101.6869 },
    description: 'Main fire station in Kuala Lumpur'
  },
  {
    id: 'station-2', 
    name: 'Petaling Jaya Fire Station',
    coordinates: { lat: 3.1073, lng: 101.6067 },
    description: 'Fire station serving Petaling Jaya area'
  },
  {
    id: 'station-3',
    name: 'Shah Alam Fire Station', 
    coordinates: { lat: 3.0733, lng: 101.5185 },
    description: 'Fire station in Shah Alam'
  },
  {
    id: 'station-4',
    name: 'Subang Jaya Fire Station',
    coordinates: { lat: 3.0478, lng: 101.5811 },
    description: 'Fire station serving Subang Jaya'
  },
  {
    id: 'station-5',
    name: 'Ampang Fire Station',
    coordinates: { lat: 3.1478, lng: 101.7617 },
    description: 'Fire station in Ampang area'
  }
];

export const loadKMLFile = async (): Promise<FireStationData[]> => {
  try {
    // KML file should be in the public directory for Vite to serve it
    const kmlPath = '/MalaysiaFireStations.kml';
    
    const response = await fetch(kmlPath);
    if (!response.ok) {
      console.warn(`Failed to load KML file: ${response.status} ${response.statusText}. Using fallback data.`);
      return fallbackFireStations;
    }
    
    const kmlContent = await response.text();
    const stations = await parseKMLFile(kmlContent);
    
    // If no stations were parsed, use fallback
    if (stations.length === 0) {
      console.warn('No stations found in KML file. Using fallback data.');
      return fallbackFireStations;
    }
    
    return stations;
  } catch (error) {
    console.error('Error loading KML file:', error);
    console.log('Using fallback fire station data.');
    return fallbackFireStations;
  }
};