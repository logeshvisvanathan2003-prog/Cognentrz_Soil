'use client';
import { useState, useEffect } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  label: string;       // human-readable place
  loading: boolean;
  denied: boolean;
}

const DEFAULT: UserLocation = {
  lat: 11.6643, lng: 78.1460, label: 'Salem, Tamil Nadu', loading: true, denied: false,
};

export function useLocation() {
  const [loc, setLoc] = useState<UserLocation>(DEFAULT);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLoc((l) => ({ ...l, loading: false, denied: true }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = 'Current location';
        try {
          // free reverse-geocode (OpenStreetMap Nominatim)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.county || a.state_district;
          const state = a.state;
          label = [city, state].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Current location';
        } catch {
          /* keep default label */
        }
        setLoc({ lat, lng, label, loading: false, denied: false });
      },
      () => setLoc((l) => ({ ...l, loading: false, denied: true })),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  return loc;
}
