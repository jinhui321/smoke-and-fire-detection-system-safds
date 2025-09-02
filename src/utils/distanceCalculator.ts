export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @returns Distance in kilometers
 */
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate estimated travel time based on distance
 * @param distance Distance in kilometers
 * @param averageSpeed Average speed in km/h (default: 50 km/h for city driving)
 * @returns Estimated time in minutes
 */
export const calculateTravelTime = (distance: number, averageSpeed: number = 50): number => {
  return Math.round((distance / averageSpeed) * 60);
};

/**
 * Sort locations by distance from a reference point
 * @param userLocation Reference point (user's location)
 * @param locations Array of locations to sort
 * @returns Sorted array with distances included
 */
export const sortByDistance = <T extends { coordinates: Coordinates }>(
  userLocation: Coordinates,
  locations: T[]
): (T & { distance: number; travelTime: number })[] => {
  return locations
    .map(location => {
      const distance = calculateDistance(userLocation, location.coordinates);
      const travelTime = calculateTravelTime(distance);
      return {
        ...location,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        travelTime
      };
    })
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Get the top N nearest locations
 * @param userLocation Reference point (user's location)
 * @param locations Array of locations
 * @param count Number of nearest locations to return (default: 5)
 * @returns Top N nearest locations with distances
 */
export const getNearestLocations = <T extends { coordinates: Coordinates }>(
  userLocation: Coordinates,
  locations: T[],
  count: number = 5
): (T & { distance: number; travelTime: number })[] => {
  const sortedLocations = sortByDistance(userLocation, locations);
  return sortedLocations.slice(0, count);
};