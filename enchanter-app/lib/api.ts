import { supabase } from './supabase';

const BASE_URL: string = (process.env.EXPO_PUBLIC_API_URL as string) ?? 'http://192.168.1.x:3000/api/v1';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchErr: any) {
    // fetch() itself threw — device is offline or server is unreachable.
    // Normalise to a consistent error shape so every caller gets the same message.
    const error: any = new Error('No connection. Please check your network and try again.');
    error.status = 0;
    error.body = { error: 'network_unavailable' };
    error.isNetworkError = true;
    throw error;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    const error: any = new Error(err.error ?? `HTTP ${res.status}`);
    error.status = res.status;
    error.body = err;
    throw error;
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

// ── Location validation ────────────────────────────────────────────────────

export type LocationValidationResult = {
  valid: boolean;
  distance_metres: number;
  site_id: string;
  site_name: string;
  radius_metres: number;
};

export const validateLocation = (
  site_id: string,
  lat: number,
  lng: number,
  accuracy?: number
) =>
  request<LocationValidationResult>('/validate-location', {
    method: 'POST',
    auth: true,
    body: { site_id, lat, lng, accuracy },
  });

// ── Spells ─────────────────────────────────────────────────────────────────

export type DurationTier = 'instant' | 'short' | 'long' | 'permanent';
export type DeliveryMethod = 'spoken' | 'signed' | 'hummed' | 'silent';

export type Spell = {
  id: string;
  site_id: string;
  creator_id: string;
  creator_username: string;
  name: string;
  expression_incantation: string | null;
  expression_delivery: DeliveryMethod | null;
  expression_colour: string | null;
  expression_sound: string | null;
  expression_notes: string | null;
  crafted_at: string;
  lunar_phase: number;
  lunar_slot: string;
  geo_value: number | null;
  geo_slot: string;
  tod_slot: string;
  season: string;
  calendar_event: string | null;
  event_modifier: string | null;
  power_score: number;
  cost: number;
  duration_tier: DurationTier;
  range_tier: string;
  concentration: boolean;
  fingerprint_hash: string;
  upvotes: number;
  downvotes: number;
  is_banned: boolean;
  // Joined fields
  site_name?: string;
  site_spell_name?: string;
  effect_description?: string;
  region?: string;
  site_type?: string;
  lore_note?: string | null;
  lineage?: LineageTransfer[];
  // Coefficients (returned on craft)
  coefficients?: {
    lunar: number;
    geo: number;
    tod: number;
    season_bonus: number;
  };
};

export type LineageTransfer = {
  id: string;
  transferred_at: string;
  from_username: string;
  to_username: string;
};

export type CraftSpellInput = {
  site_id: string;
  name: string;
  expression_incantation?: string;
  expression_delivery?: DeliveryMethod;
  expression_colour?: string;
  expression_sound?: string;
  expression_notes?: string;
  lat?: number;
  lng?: number;
};

export type SpellLibraryParams = {
  page?: number;
  limit?: number;
  site_id?: string;
  duration_tier?: DurationTier;
  min_score?: number;
  search?: string;
  sort?: 'power_score_desc' | 'power_score_asc' | 'date_desc' | 'date_asc' | 'upvotes_desc';
};

export type SpellLibraryResponse = {
  data: Spell[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export const craftSpell = (input: CraftSpellInput) =>
  request<Spell>('/spells', { method: 'POST', auth: true, body: input });

export const getSpells = (params: SpellLibraryParams = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<SpellLibraryResponse>(`/spells${query}`);
};

export const getMySpells = (_params: SpellLibraryParams = {}) =>
  request<SpellLibraryResponse>('/spells/mine', { auth: true });

export const getSpell = (id: string) => request<Spell>(`/spells/${id}`);

function buildQuery(params: Record<string, any>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ── Votes ──────────────────────────────────────────────────────────────────

export type VoteDirection = 'up' | 'down';

export type VoteResponse = {
  spell_id: string;
  user_vote: VoteDirection | null;
  upvotes: number;
  downvotes: number;
  is_banned: boolean;
  removed?: boolean;
};

export const voteSpell = (id: string, vote: VoteDirection) =>
  request<VoteResponse>(`/spells/${id}/vote`, {
    method: 'POST',
    auth: true,
    body: { vote },
  });

export const removeVote = (id: string) =>
  request<VoteResponse>(`/spells/${id}/vote`, {
    method: 'DELETE',
    auth: true,
  });

// ── Bookmarks ──────────────────────────────────────────────────────────────

export type BookmarkResponse = {
  spell_id: string;
  bookmarked: boolean;
  removed?: boolean;
};

export const bookmarkSpell = (id: string) =>
  request<BookmarkResponse>(`/spells/${id}/bookmark`, {
    method: 'POST',
    auth: true,
  });

export const removeBookmark = (id: string) =>
  request<BookmarkResponse>(`/spells/${id}/bookmark`, {
    method: 'DELETE',
    auth: true,
  });

export type BookmarksParams = {
  page?: number;
  limit?: number;
};

export const getMyBookmarks = (params: BookmarksParams = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<SpellLibraryResponse>(`/users/me/bookmarks${query}`, { auth: true });
};

// ── User profile ───────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  spells_crafted: number;
  spells_bookmarked: number;
  spells_received: number;
};

export const getUserProfile = () =>
  request<UserProfile>('/users/me', { auth: true });

// ── Transfer ───────────────────────────────────────────────────────────────

export type TransferDegradation = {
  quality: number;
  matched_axes: number;
  axis_detail: {
    lunar: boolean;
    geo: boolean;
    tod: boolean;
    season: boolean;
  };
  degraded_power_score: number;
  degraded_cost: number;
  degraded_duration_tier: string;
  degraded_range_tier: string;
  degraded_concentration: boolean;
};

export type TransferGenerateResponse = {
  token: string;
  spell_id: string;
  expires_at: string;
  spell: {
    name: string;
    site_spell_name: string;
    power_score: number;
  };
  transfer: TransferDegradation;
};

export type TransferPreviewResponse = {
  token: string;
  from_username: string;
  expires_at: string;
  spell: Spell & { lineage: LineageTransfer[] };
  transfer: Omit<TransferDegradation, 'axis_detail' | 'matched_axes'>;
};

export type TransferAcceptResponse = Spell & {
  transferred_from: string;
  transfer_quality: number;
};

export const generateTransfer = (spell_id: string) =>
  request<TransferGenerateResponse>('/transfer/generate', {
    method: 'POST',
    auth: true,
    body: { spell_id },
  });

export const previewTransfer = (token: string) =>
  request<TransferPreviewResponse>(`/transfer/preview/${token}`, { auth: true });

export const acceptTransfer = (token: string) =>
  request<TransferAcceptResponse>('/transfer/accept', {
    method: 'POST',
    auth: true,
    body: { token },
  });

// ── Conversion ─────────────────────────────────────────────────────────────

export type ConversionBlock = {
  spell_name_5e:  string;
  school:         string;
  level:          string;
  level_num:      number;
  slot:           string;
  duration:       string;
  range:          string;
  dc:             number;
  damage:         string;
  concentration:  boolean;
  description:    string;
};

export type SpellConversionResponse = {
  spell_id:               string;
  spell_name:             string;
  creator_username:       string;
  site_name:              string;
  region:                 string | null;
  crafted_at:             string;
  power_score:            number;
  cost:                   number;
  duration_tier:          string;
  range_tier:             string;
  concentration:          boolean;
  expression_incantation: string | null;
  expression_delivery:    string | null;
  expression_colour:      string | null;
  expression_sound:       string | null;
  expression_notes:       string | null;
  conversion:             ConversionBlock;
};

export const getSpellConversion = (id: string) =>
  request<SpellConversionResponse>(`/conversion/spell/${id}`);

export default {
  getSites, getSite, validateLocation,
  craftSpell, getSpells, getMySpells, getSpell,
  voteSpell, removeVote,
  bookmarkSpell, removeBookmark, getMyBookmarks,
  getUserProfile,
  generateTransfer, previewTransfer, acceptTransfer,
  getSpellConversion,
};
