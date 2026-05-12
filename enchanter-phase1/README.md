# Enchanter — Phase 1

A physical-world spell crafting layer for tabletop RPGs.  
Phase 1 covers: database schema, backend scaffold, sites API, React Native app shell, Map screen, Auth screens.

---

## Structure

```
enchanter/
├── backend/          Node.js + Express API
└── mobile/           React Native (Expo) app
```

---

## Quick Start

### 1. Supabase project

1. Create a project at https://supabase.com
2. Copy the **Project URL** and **anon key** (for mobile) and **service role key** (for backend)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL (from Supabase > Settings > Database > Connection string)
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

npm install
node db/migrate.js    # Creates all tables
node db/seed.js       # Seeds 3 test sites
npm run dev           # Starts on port 3000
```

Verify:
```
GET http://localhost:3000/api/v1/health     → { status: "ok", db: "connected" }
GET http://localhost:3000/api/v1/sites      → [ ...3 sites... ]
GET http://localhost:3000/api/v1/sites/:id  → { ...site... }
```

### 3. Mobile

```bash
cd mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
# Set EXPO_PUBLIC_API_URL to your backend (use your machine's LAN IP if testing on device)

npm install
npx expo start
```

**Fonts** — download and place in `mobile/assets/fonts/`:
- Cinzel-Regular.ttf + Cinzel-Bold.ttf (Google Fonts)
- CormorantGaramond-Regular.ttf + CormorantGaramond-Italic.ttf (Google Fonts)
- SpaceMono-Regular.ttf (Google Fonts)

**Google Maps (Android)** — add your Maps API key to `app.json` under `android.config.googleMaps.apiKey`.

---

## Phase 1 Deliverables

| Item | Status |
|------|--------|
| DB schema — users, sites, spells, lineage, votes, bookmarks | ✅ `db/migrate.js` |
| 3 test sites seeded (coastal / landlocked / edge case) | ✅ `db/seed.js` |
| `GET /api/v1/sites` | ✅ `routes/sites.js` |
| `GET /api/v1/sites/:id` | ✅ `routes/sites.js` |
| Supabase auth middleware | ✅ `middleware/auth.js` |
| React Native Expo project | ✅ `mobile/` |
| Login + Register screens | ✅ `app/auth/login.tsx` |
| Map screen — sites as markers, site detail sheet | ✅ `app/tabs/map.tsx` |
| Tab navigator (5 tabs, 4 stubbed for later phases) | ✅ `app/tabs/_layout.tsx` |
| Session-aware routing (auth → tabs redirect) | ✅ `app/index.tsx` |

---

## What's Next (Phase 2)

- suncalc lunar phase integration
- Open-Meteo pressure API
- NOAA SWPC Kp index
- Sacred calendar module
- Formula module (`lib/formula.js`) with unit tests
- Live celestial bar on Map screen
