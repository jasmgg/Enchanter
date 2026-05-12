import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export type LunarSlot = 'new' | 'crescent' | 'quarter' | 'gibbous' | 'full';
export type KpSlot = 'quiet' | 'unsettled' | 'active' | 'storm' | 'severe';
export type PressureSlot = 'stormy' | 'unsettled' | 'neutral' | 'clear' | 'serene';
export type TodSlot = 'midnight' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type CelestialData = {
  timestamp: string;
  lunar: { phase: number; slot: LunarSlot };
  kp: { value: number | null; slot: KpSlot };
  tod: { slot: TodSlot };
  season: Season;
  calendar_event: string | null;
  event_modifier: string | null;
};

export type PressureData = {
  pressure_hpa: number | null;
  slot: PressureSlot;
};

export function useCelestial() {
  const [celestial, setCelestial] = useState<CelestialData | null>(null);
  const [pressure, setPressure] = useState<PressureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCelestial = useCallback(async () => {
    try {
      // Try to get location for precise ToD calculation
      let locParam = '';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          locParam = `?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`;

          // Also fetch pressure for the user's current location
          const pressRes = await fetch(`${API_URL}/celestial/pressure?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`);
          if (pressRes.ok) {
            const pressData = await pressRes.json();
            setPressure({ pressure_hpa: pressData.pressure_hpa, slot: pressData.slot });
          }
        }
      } catch {
        // Location permission denied or error — continue without it
      }

      const res = await fetch(`${API_URL}/celestial/current${locParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CelestialData = await res.json();
      setCelestial(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCelestial();
    const interval = setInterval(fetchCelestial, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCelestial]);

  return { celestial, pressure, loading, error, refresh: fetchCelestial };
}
