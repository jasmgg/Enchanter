import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('supabase_token');
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Sites ──────────────────────────────────────────────────────────────────

export type Site = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_metres: number;
  site_type: 'coastal' | 'landlocked';
  spell_name: string;
  effect_description: string;
  lore_note: string | null;
  region: string | null;
  affinity_lunar: 'light' | 'dark';
  affinity_geo: 'high_pressure' | 'low_pressure' | 'calm_solar' | 'charged_solar';
  affinity_tod: 'light' | 'dark';
  affinity_season: 'spring' | 'summer' | 'autumn' | 'winter';
};

export const getSites = () => request<Site[]>('/sites');
export const getSite = (id: string) => request<Site>(`/sites/${id}`);

export default { getSites, getSite };
