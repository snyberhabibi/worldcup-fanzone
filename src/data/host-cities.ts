/**
 * FIFA World Cup 2026 host cities.
 *
 * The 2026 tournament is co-hosted by Canada, Mexico, and the United States
 * across 16 host cities. Coordinates are the host metro / stadium location
 * (decimal degrees, +N / +E). Dallas/Arlington is flagged for brand emphasis
 * (this is a Dallas watch-party experience).
 */

export interface City {
  /** Display name of the host city (region/stadium suburb in parens where relevant). */
  name: string;
  /** Host country. */
  country: 'USA' | 'Canada' | 'Mexico';
  /** Latitude in decimal degrees (north positive). */
  lat: number;
  /** Longitude in decimal degrees (east positive / west negative). */
  lng: number;
  /** Optional brand emphasis flag — the Dallas/Arlington pin is highlighted. */
  highlight?: boolean;
}

export const HOST_CITIES: City[] = [
  // United States (11)
  { name: 'Atlanta', country: 'USA', lat: 33.7554, lng: -84.4008 }, // Mercedes-Benz Stadium
  { name: 'Boston (Foxborough)', country: 'USA', lat: 42.0909, lng: -71.2643 }, // Gillette Stadium
  { name: 'Dallas (Arlington)', country: 'USA', lat: 32.7473, lng: -97.0945, highlight: true }, // AT&T Stadium
  { name: 'Houston', country: 'USA', lat: 29.6847, lng: -95.4107 }, // NRG Stadium
  { name: 'Kansas City', country: 'USA', lat: 39.0489, lng: -94.4839 }, // Arrowhead Stadium
  { name: 'Los Angeles (Inglewood)', country: 'USA', lat: 33.9535, lng: -118.3392 }, // SoFi Stadium
  { name: 'Miami', country: 'USA', lat: 25.958, lng: -80.2389 }, // Hard Rock Stadium
  { name: 'New York–New Jersey (East Rutherford)', country: 'USA', lat: 40.8135, lng: -74.0745 }, // MetLife Stadium
  { name: 'Philadelphia', country: 'USA', lat: 39.9008, lng: -75.1675 }, // Lincoln Financial Field
  { name: 'San Francisco Bay Area (Santa Clara)', country: 'USA', lat: 37.403, lng: -121.9698 }, // Levi's Stadium
  { name: 'Seattle', country: 'USA', lat: 47.5952, lng: -122.3316 }, // Lumen Field

  // Canada (2)
  { name: 'Toronto', country: 'Canada', lat: 43.6332, lng: -79.4185 }, // BMO Field
  { name: 'Vancouver', country: 'Canada', lat: 49.2768, lng: -123.1119 }, // BC Place

  // Mexico (3)
  { name: 'Mexico City', country: 'Mexico', lat: 19.3029, lng: -99.1505 }, // Estadio Azteca
  { name: 'Guadalajara', country: 'Mexico', lat: 20.6818, lng: -103.4626 }, // Estadio Akron
  { name: 'Monterrey', country: 'Mexico', lat: 25.6695, lng: -100.2444 }, // Estadio BBVA
];

/** Total number of FIFA World Cup 2026 host cities. */
export const HOST_CITY_COUNT = HOST_CITIES.length;
