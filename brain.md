# ReckonX Navigation — Central Brain & Knowledge Map (`brain.md`)

This document is the **central architectural brain and knowledge map** for the **ReckonX Navigation** codebase. It provides complete context for AI coding agents and human developers regarding the system architecture, file responsibilities, data flows, core algorithms, state management, dependencies, and decision guidelines.

---

## 1. Project Overview

* **Project Name:** `reckon-x` (ReckonX Navigation)
* **Main Purpose:** A production-grade, intelligent Dead Reckoning (DR) navigation system designed specifically for tunnels, underground corridors, urban canyons, and low/zero-GNSS signal environments.
* **Target Users/Actors:** Fleet Drivers, Autonomous/Teleoperated Vehicle Operators, Telematics Engineers, and Field Testers.
* **Core Features:**
  * **Hardware Sensor Streaming:** Direct ingestion of 3-axis Accelerometer, Gyroscope, and Magnetometer (Compass) data via W3C `DeviceMotionEvent` and `DeviceOrientationEvent` APIs with support for iOS WebKit permission workflows.
  * **Kalman & Dead Reckoning Engine:** Kinematic stepping integration, Haversine distance, Exponential Moving Average (EMA) position filtering, and Zero Velocity Update (ZUPT) stationary drift suppression.
  * **Multi-Source Heading Fusion Pipeline:** Speed-aware angular fusion combining Magnetometer compass bearing, GNSS track bearing, Trajectory azimuth, and Gyroscope angular rate with shortest-path angular interpolation to prevent 355° $\rightarrow$ 5° spin glitches.
  * **Dynamic Drivable Routing & Fallback:** Turn-by-turn route calculation via OSRM Public Routing API with seamless automatic fallback to Haversine straight-line polylines when offline.
  * **Location Search & Geocoding:** 400ms debounced Nominatim search with an in-memory 50-item LRU cache, reverse geocoding, and a built-in offline POI database.
  * **Offline Map Tile Caching:** Custom Leaflet `TileLayer` extension intercepting tile requests to persist and serve tiles via IndexedDB (`IDR_Tile_Cache_DB`), returning dynamically rendered SVG placeholder tiles on offline cache misses.
  * **4-Scenario Operational Matrix:**
    1. **Scenario 1:** `[GPS ON + Net ON]` Standard Online Navigation
    2. **Scenario 2:** `[GPS OFF + Net ON]` GNSS Outage / Tunnel Mode
    3. **Scenario 3:** `[GPS ON + Net OFF]` Pure Offline Satellite Mode
    4. **Scenario 4:** `[GPS OFF + Net OFF]` Pure Offline Dead Reckoning
  * **Multi-Trajectory Map Overlay:** Interactive Leaflet map visualizing Primary Road Polyline, AI DR Path (amber dashed), and Raw INS Drift Path (red transparent). Supports North-Up and Head-Up (Follow Vehicle) camera modes.
  * **Real-time 100 Hz Telemetry & Waveform:** Real-time visual Canvas graph plotting X/Y/Z accelerometer vectors and sensor diagnostic tables.
  * **Trip Analytics & Log Export:** Post-trip benchmark summary dashboard with CSV telemetry log generation.
* **Major Technologies:**
  * **Frontend:** React 19, TypeScript 6, Vite 5, React Router DOM 7, TailwindCSS v4 (`@tailwindcss/vite`), Leaflet 1.9, Lucide React icons, Oxlint.
  * **Storage:** Browser IndexedDB (`IDR_Tile_Cache_DB`) and in-memory LRU cache.
  * **APIs:** HTML5 Geolocation API, W3C DeviceMotion & DeviceOrientation APIs, OpenStreetMap Nominatim API, OSRM Routing API.
  * **Backend/Database:** None. Pure client-side edge application with zero external server dependencies for core dead reckoning.

---

## 2. Project Architecture

```text
User / Vehicle Hardware Sensors (Accel, Gyro, Compass, GPS)
                        ↓
            W3C Hardware Browser APIs
 (Geolocation API, DeviceMotionEvent, DeviceOrientationEvent)
                        ↓
           Low-Level Service Layer
 ┌────────────────────────────────────────────────────────┐
 │ - SensorService (Hardware streams & WebKit permissions)│
 │ - LocationService (Nominatim, LRU Cache, OSRM, POIs)   │
 │ - OrientationService (Multi-Source Heading Fusion)     │
 │ - DeadReckoningEngine (ZUPT, Kinematics, LERP, EMA)   │
 │ - TileCacheService (IndexedDB Tile Interceptor)        │
 └────────────────────────────────────────────────────────┘
                        ↓
           Global Context Layer (`NavigationContext`)
  (Holds SensorStatus, RouteState, TelemetryData, Settings,
   OperationalMatrixScenario, Tile Cache Counts, Toast state)
                        ↓
            UI Layout & Component Layer
  ┌───────────────────────────────────────────────────────┐
  │ - MobileShell (Responsive device container)           │
  │ - MapView (Leaflet multi-trajectory canvas)           │
  │ - TelemetryChart (HTML5 Canvas accelerometer graph)   │
  │ - NavigationHUD / TopHeader / BottomNav / Toast       │
  └───────────────────────────────────────────────────────┘
                        ↓
                   Application Pages
 (SplashPage → LoginPage → PermissionsPage → ExplorePage →
  RouteSetupPage → NavigationHudPage → TelemetryPage →
  SummaryPage → ProfilePage)
```

---

## 3. Complete Project Tree

```text
SIH 26/
├── .gitignore                      # Git ignore patterns
├── .oxlintrc.json                  # Oxlint linter rules
├── index.html                      # Single Page Application HTML entry
├── netlify.toml                    # Netlify deployment configuration
├── package.json                    # Dependencies & npm build scripts
├── README.md                       # Project overview documentation
├── tsconfig.app.json               # TypeScript config for application code
├── tsconfig.json                   # Main TypeScript solution config
├── tsconfig.node.json              # TypeScript config for Vite/Node environment
├── vercel.json                     # Vercel deployment routes config
├── vite.config.ts                  # Vite build tool setup with Tailwind plugin
├── public/                         # Static public assets
└── src/                            # Source code root
    ├── App.css                     # Component styling overrides
    ├── App.tsx                     # Main React Application & Router setup
    ├── index.css                   # Global CSS, Tailwind v4 import & Leaflet styles
    ├── main.tsx                    # React DOM root mounting script
    ├── components/                 # Reusable UI components
    │   ├── BottomNav.tsx           # Tab bar navigation footer (Explore, Setup, Telemetry, Profile)
    │   ├── MapView.tsx             # Interactive Leaflet map container with IndexedDB tile layer
    │   ├── MobileShell.tsx         # Mobile phone container viewport frame
    │   ├── TelemetryChart.tsx      # Real-time HTML5 canvas acceleration chart
    │   ├── Toast.tsx               # Floating notification toast banner
    │   └── TopHeader.tsx           # Header component with back buttons and title
    ├── context/                    # React Context State Management
    │   └── NavigationContext.tsx   # Central Navigation Provider & Context definition
    ├── pages/                      # View router pages
    │   ├── ExplorePage.tsx         # Destination search & interactive map pin selection
    │   ├── LoginPage.tsx           # Driver sign-in credentials page
    │   ├── NavigationHudPage.tsx   # Real-time Turn-by-Turn navigation HUD & matrix control
    │   ├── PermissionsPage.tsx     # Hardware sensor & GPS permission checklist
    │   ├── ProfilePage.tsx         # Driver stats, system toggle settings & log clearing
    │   ├── RouteSetupPage.tsx      # Drivable route selector & origin/destination configuration
    │   ├── SplashPage.tsx          # Startup hardware diagnostic & loading screen
    │   ├── SummaryPage.tsx         # Post-trip analytics report & CSV log exporter
    │   └── TelemetryPage.tsx       # Live 100 Hz sensor stream inspector & zero-point calibration
    ├── services/                   # Business logic & core algorithm engine modules
    │   ├── deadReckoningEngine.ts  # Kinematic stepping, ZUPT, Haversine, LERP & EMA filters
    │   ├── locationService.ts      # Nominatim search, LRU cache, OSRM routing & geocoding
    │   ├── OrientationService.ts   # Multi-source heading fusion & shortest-path angular filter
    │   ├── sensorService.ts        # Browser motion/orientation listeners & permission handlers
    │   └── tileCacheService.ts     # IndexedDB tile cache store & SVG placeholder renderer
    └── types/                      # TypeScript interface and type declarations
        └── navigation.ts           # Core navigation types (RouteState, TelemetryData, Scenario, etc.)
```

---

## 4. File Responsibility Map

| File | Responsibility | Depends On | Used By | Important Exported Symbols |
| --- | --- | --- | --- | --- |
| [`src/types/navigation.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/types/navigation.ts) | Defines all TypeScript domain interfaces and types | None | Context, Services, Pages, Components | `OperationalMatrixScenario`, `SensorStatus`, `RouteState`, `TelemetryData`, `SettingsState`, `UserProfile`, `NavigationContextType` |
| [`src/context/NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/context/NavigationContext.tsx) | Central React State Provider for global route, telemetry, sensors, matrix scenarios, & tile cache | `navigation.ts`, `LocationService`, `SensorService`, `TileCacheService` | `App.tsx`, all pages and components | `NavigationProvider`, `useNavigationContext` |
| [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/deadReckoningEngine.ts) | Performs Dead Reckoning kinematics, ZUPT drift suppression, Haversine distance, LERP & EMA smoothing | None | `LocationService`, `NavigationContext`, `NavigationHudPage` | `DeadReckoningEngine` (`calculateHaversineDistance`, `lerpCoordinate`, `emaFilterPosition`, `checkZuptStationary`, `stepKinematics`) |
| [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/OrientationService.ts) | Multi-source heading fusion pipeline, forward bearing calculations, shortest-path angular smoothing | None | `NavigationHudPage` | `OrientationService` (`calculateBearing`, `normalizeAngle`, `smoothHeading`, `formatCardinalHeading`, `fuseHeading`, `subscribeOrientationEvents`) |
| [`src/services/locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts) | Handles Nominatim search with 400ms debounce & 50-item LRU cache, reverse geocoding, OSRM routing & Haversine fallback | `deadReckoningEngine.ts` | `NavigationContext`, `ExplorePage`, `RouteSetupPage` | `LocationService` (`getCurrentLocation`, `searchLocation`, `reverseGeocode`, `calculateRoute`, `generateFallbackRoute`) |
| [`src/services/sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/sensorService.ts) | Low-level listener wrapper for browser `devicemotion` and `deviceorientation` with iOS WebKit permission handlers | None | `NavigationContext`, `NavigationHudPage` | `SensorService` (`hasMotionSupport`, `hasOrientationSupport`, `requestMotionPermission`, `requestOrientationPermission`, `subscribeMotion`, `subscribeOrientation`) |
| [`src/services/tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/tileCacheService.ts) | Manages map tile storage/retrieval in IndexedDB (`IDR_Tile_Cache_DB`) and generates SVG offline placeholder tiles | None | `NavigationContext`, `MapView` | `TileCacheService` (`saveTile`, `getTile`, `getCacheCount`, `clearCache`, `getPlaceholderTile`) |
| [`src/components/MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/MapView.tsx) | Leaflet map renderer with custom `IndexedDBTileLayer`, multi-trajectory polylines, custom markers, & Head-Up rotation | `TileCacheService`, Leaflet | `ExplorePage`, `NavigationHudPage`, `SummaryPage` | `MapView` |
| [`src/components/MobileShell.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/MobileShell.tsx) | Container layout framing views inside a mobile smartphone viewport | None | All Pages | `MobileShell` |
| [`src/components/TelemetryChart.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/TelemetryChart.tsx) | HTML5 Canvas real-time rolling 3-axis accelerometer waveform plot | None | `TelemetryPage` | `TelemetryChart` |
| [`src/components/BottomNav.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/BottomNav.tsx) | Bottom tab bar for top-level app page routing | React Router DOM | `MobileShell` footers | `BottomNav` |
| [`src/components/TopHeader.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/TopHeader.tsx) | Header header bar with title, subtitle, and navigation back button | React Router DOM | Pages | `TopHeader` |
| [`src/components/Toast.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/Toast.tsx) | Global popup toast notification alert banner | `NavigationContext` | `App.tsx` | `Toast` |
| [`src/pages/SplashPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/SplashPage.tsx) | Hardware diagnostic checklist & initial boot screen | `MobileShell` | Route `/` | `SplashPage` |
| [`src/pages/LoginPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/LoginPage.tsx) | Driver credential authentication form | `NavigationContext`, `MobileShell` | Route `/login` | `LoginPage` |
| [`src/pages/PermissionsPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/PermissionsPage.tsx) | Explicit hardware sensor and GPS permission requester page | `NavigationContext`, `TopHeader`, `MobileShell` | Route `/permissions` | `PermissionsPage` |
| [`src/pages/ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/ExplorePage.tsx) | Interactive destination search, pin placement, and map view | `NavigationContext`, `LocationService`, `MapView`, `BottomNav`, `MobileShell` | Route `/explore` | `ExplorePage` |
| [`src/pages/RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/RouteSetupPage.tsx) | Origin/destination configuration & drivable route option selector | `NavigationContext`, `LocationService`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/route-setup` | `RouteSetupPage` |
| [`src/pages/NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/NavigationHudPage.tsx) | Active navigation HUD, multi-trajectory map, scenario matrix toggle, & live fusion ticker | `NavigationContext`, `OrientationService`, `DeadReckoningEngine`, `SensorService`, `MapView`, `MobileShell` | Route `/navigation` | `NavigationHudPage` |
| [`src/pages/TelemetryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/TelemetryPage.tsx) | Real-time 100 Hz sensor stream data table & canvas plot | `NavigationContext`, `TelemetryChart`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/telemetry` | `TelemetryPage` |
| [`src/pages/SummaryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/SummaryPage.tsx) | Post-trip benchmark analysis & CSV log exporter | `NavigationContext`, `MapView`, `TopHeader`, `MobileShell` | Route `/summary` | `SummaryPage` |
| [`src/pages/ProfilePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/ProfilePage.tsx) | Driver profile stats, system settings, & log/cache clearing | `NavigationContext`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/profile` | `ProfilePage` |

---

## 5. Dependency / Relationship Map

```text
[App.tsx]
  ├── Wraps with <NavigationProvider> (from NavigationContext.tsx)
  ├── Registers BrowserRouter routes:
  │    ├── "/"          → <SplashPage />
  │    ├── "/login"     → <LoginPage />
  │    ├── "/permissions" → <PermissionsPage />
  │    ├── "/explore"   → <ExplorePage />
  │    ├── "/route-setup" → <RouteSetupPage />
  │    ├── "/navigation" → <NavigationHudPage />
  │    ├── "/telemetry" → <TelemetryPage />
  │    ├── "/summary"   → <SummaryPage />
  │    └── "/profile"   → <ProfilePage />
  └── Renders <Toast />

[NavigationContext.tsx]
  ├── Uses LocationService  → (Calls calculateRoute, getCurrentLocation)
  ├── Uses SensorService    → (Subscribes to devicemotion & deviceorientation)
  └── Uses TileCacheService → (Interacts with IndexedDB tile storage)

[LocationService.ts]
  ├── Calls OSRM API (https://router.project-osrm.org)
  ├── Calls Nominatim API (https://nominatim.openstreetmap.org)
  └── Uses DeadReckoningEngine → (For Haversine distance & LERP interpolation)

[MapView.tsx]
  ├── Extends L.TileLayer → (IndexedDBTileLayer reads/writes through TileCacheService)
  └── Renders Leaflet map canvas with custom Markers & Polylines

[NavigationHudPage.tsx]
  ├── Reads state from NavigationContext
  ├── Uses SensorService → (Direct devicemotion stream)
  ├── Uses OrientationService → (fuseHeading algorithm)
  ├── Uses DeadReckoningEngine → (Haversine calculations)
  └── Renders <MapView mode="navigation" />
```

---

## 6. Complete Application Flow

### Startup Flow

```text
Application Starts (index.html -> main.tsx -> App.tsx)
 ↓
NavigationProvider initializes state & window listeners (online/offline)
 ↓
IndexedDB Connection Opened (IDR_Tile_Cache_DB) & Tile Count Refreshed
 ↓
Automatic GPS Location Acquisition Triggered (acquireLiveLocation)
 ↓
User lands on SplashPage ("/") → Progress Bar Diagnostics Run
 ↓
User clicks "Continue to Sign-In" → Navigates to LoginPage ("/login")
```

### User Navigation Lifecycle Flow

```text
1. Sign In (LoginPage)
   ↓ User inputs email/PIN & submits
   ↓ loginUser() updates NavigationContext state
2. Permissions Check (PermissionsPage)
   ↓ User calibrates compass / grants sensors
   ↓ grantAllSensors() updates sensorStatus state
3. Explore & Destination Selection (ExplorePage)
   ↓ User searches location via Nominatim OR taps Leaflet map OR drags red pin
   ↓ LocationService.searchLocation() [debounced 400ms, checks LRU Cache / Offline POIs]
   ↓ LocationService.calculateRoute() [queries OSRM API -> falls back to Haversine if offline]
   ↓ RouteState updated in NavigationContext
4. Route Setup (RouteSetupPage)
   ↓ User selects recommended OSRM route or surface bypass corridor
   ↓ User clicks "Start Live Navigation"
5. Active Navigation HUD (NavigationHudPage)
   ↓ Vehicle chevron moves along route (Live Geolocation or Simulation)
   ↓ 10 Hz Ticker runs OrientationService.fuseHeading()
   ↓ IndexedDBTileLayer fetches/caches map tiles dynamically
   ↓ User can switch Operational Matrix Scenario (1-4)
6. Post-Trip Analysis (SummaryPage)
   ↓ Displays completed trajectory, outage benchmarks, & CSV export button
```

---

## 7. Feature-by-Feature Flow

### 1. Hardware Diagnostic & Sensor Setup
* **Files:** [`SplashPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/SplashPage.tsx), [`PermissionsPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/PermissionsPage.tsx), [`sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/sensorService.ts).
* **Behavior:** Checks browser motion support (`hasMotionSupport`), orientation support (`hasOrientationSupport`), and handles WebKit explicit user gesture permission requests (`requestMotionPermission`, `requestOrientationPermission`).
* **Validation:** Returns booleans for each sensor state (`accel`, `gyro`, `compass`, `gnss`).

### 2. Destination Search & Geocoding
* **Files:** [`ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/ExplorePage.tsx), [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts).
* **Behavior:**
  1. Checks 50-item in-memory LRU search cache (`lruSearchCache`).
  2. If network is offline, immediately searches `OFFLINE_POI_DATABASE`.
  3. If online, issues a 400ms debounced `fetch` request to Nominatim API.
  4. User can also tap anywhere on the Leaflet map to trigger `reverseGeocode(lat, lng)`.

### 3. Dynamic Drivable Routing & Fallback
* **Files:** [`RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/RouteSetupPage.tsx), [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts), [`deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/deadReckoningEngine.ts).
* **Behavior:** Queries `https://router.project-osrm.org/route/v1/driving/`. Converts GeoJSON `[lng, lat]` coordinates into Leaflet `[lat, lng]` polyline coordinates. If unreachable or offline, calls `generateFallbackRoute()`, constructing a 15-step straight-line LERP route using Haversine distance calculations.

### 4. Turn-by-Turn Guidance & Heading Fusion
* **Files:** [`NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/NavigationHudPage.tsx), [`OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/OrientationService.ts).
* **Behavior:** Runs a 10 Hz ticker executing `fuseHeading()`. Weighting adapts dynamically based on vehicle speed:
  * **High Speed (> 5 km/h):** Blends 70% GNSS Track Bearing + 30% Trajectory Bearing.
  * **Medium Speed (2–5 km/h):** Blends Magnetometer Compass and Trajectory.
  * **Stationary ($\le$ 2 km/h):** Smoothly transitions to Hardware Compass.
  * **GNSS Outage:** Integrates Gyroscope Z rate ($\text{deg/sec} \times dt$) smoothed against trajectory azimuth.

### 5. IndexedDB Tile Caching & Offline Map Fallback
* **Files:** [`tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/tileCacheService.ts), [`MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/MapView.tsx).
* **Behavior:** `IndexedDBTileLayer` intercepts Leaflet `createTile()`. Looks up tile URL in IndexedDB store `tiles`. On cache hit, assigns Base64 data URL to `img.src`. On cache miss while online, fetches tile, converts to Base64, and saves to IndexedDB. On cache miss while offline, serves a custom 256x256 SVG placeholder tile ("OFFLINE TILE MISS").

---

## 8. Database Architecture

The application uses **Browser IndexedDB** for local persistent map tile caching.

### IndexedDB Store Details
* **Database Name:** `IDR_Tile_Cache_DB`
* **Version:** `1`
* **Object Store Name:** `tiles`
* **Key Path:** `url` (String)

```text
IDR_Tile_Cache_DB (IndexedDB)
 └── tiles (Object Store)
      ├── url (PK: e.g. "https://a.tile.openstreetmap.org/10/300/400.png")
      ├── dataUrl (String: "data:image/png;base64,...")
      └── timestamp (Number: Unix timestamp in ms)
```

### In-Memory Cache Structures
* **Search Cache:** `lruSearchCache` (Map<string, SearchResult[]>, max size: 50).
* **Offline POI Fallback:** `OFFLINE_POI_DATABASE` (Static array of key Indian infrastructure locations: Mumbai Airport, Gateway of India, BKC, Marine Drive, Dadar Station, Pune Station, Thane Station, Navi Mumbai Airport).

---

## 9. API Documentation

### External HTTP APIs (Client-side consumed)

| Method | Endpoint | Purpose | Request Parameters | Response | Implementation File |
| --- | --- | --- | --- | --- | --- |
| GET | `https://nominatim.openstreetmap.org/search` | Geocoding Search | `format=json&q=<query>&limit=5` | JSON Array of `SearchResult` (`lat`, `lon`, `display_name`) | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts) |
| GET | `https://nominatim.openstreetmap.org/reverse` | Reverse Geocoding | `format=json&lat=<lat>&lon=<lng>` | JSON Object with `display_name` | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts) |
| GET | `https://router.project-osrm.org/route/v1/driving/{coords}` | Drivable Routing | `{startLng},{startLat};{destLng},{destLat}?overview=full&geometries=geojson` | GeoJSON route geometry, distance (m), duration (s) | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts) |

### Native Browser Web APIs
* **Geolocation API:** `navigator.geolocation.getCurrentPosition()` and `watchPosition()`
* **Motion API:** `window.addEventListener('devicemotion')`
* **Orientation API:** `window.addEventListener('deviceorientation')` / `deviceorientationabsolute`

---

## 10. Frontend Architecture

* **Framework:** React 19 SPA powered by Vite 5.
* **Styling:** TailwindCSS v4 imported in `src/index.css` via `@import "tailwindcss";`. Minimal custom Leaflet container overrides.
* **Component Layout Shell:** All pages are wrapped inside `MobileShell.tsx` which renders a phone frame (max width: 430px) with fixed top header and bottom tab bar slots.
* **Icons:** `lucide-react` icons throughout.
* **Routing:** `react-router-dom` v7 with hashless browser routes.

---

## 11. Backend Architecture

**Not Applicable.** The application is built entirely as an autonomous client-side SPA. All Dead Reckoning algorithms, Kalman filtering, heading fusion, tile caching, and fallback geocoding execute directly in the user's browser environment.

---

## 12. Important Algorithms / Business Logic

### 1. Multi-Source Heading Fusion Pipeline (`fuseHeading`)
* **Location:** [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/OrientationService.ts#L92)
* **Purpose:** Calculates a smooth, unified vehicle heading angle from noisy hardware sensors.
* **Logic:**
  1. Evaluates vehicle speed and GNSS availability.
  2. Blends Magnetometer compass, GNSS track bearing, trajectory azimuth, and integrated Gyroscope Z angular rate ($\text{deg/sec} \times dt$).
  3. Passes raw target heading through `smoothHeading()` for 10 Hz shortest-path angular filtering.

### 2. Shortest-Path Angular Interpolation (`smoothHeading`)
* **Location:** [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/OrientationService.ts#L56)
* **Purpose:** Prevents 355° $\rightarrow$ 5° angular spin glitches when crossing the North boundary.
* **Logic:** Calculates rotational arc difference (`normTarget - normCurrent`). If difference > 180°, subtracts 360°; if < -180°, adds 360°. Smooths with factor $\alpha=0.2$.

### 3. Zero Velocity Update (ZUPT) Filter (`checkZuptStationary`)
* **Location:** [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/deadReckoningEngine.ts#L73)
* **Purpose:** Detects stationary vehicle state to halt integration drift accumulation during stops.
* **Logic:** Evaluates absolute linear acceleration ($|a| < 0.25 \text{ m/s}^2$). If sustained for $\ge 0.5 \text{ seconds}$, sets stationary flag `isZuptActive = true` and freezes speed to `0`.

---

## 13. State Management

All shared state lives in [`src/context/NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/context/NavigationContext.tsx):

* `sensorStatus`: Hardware toggle states (`accel`, `gyro`, `compass`, `gnss`).
* `routeState`: Current route origins, destinations, coordinates, distances, durations, error strings, and fallback flags.
* `telemetry`: Vehicle speed, drift error (m), ETA, acceleration vector ($a_x, a_y, a_z$), and orientation angles ($\text{pitch}, \text{roll}, \text{yaw}$).
* `settings`: Toggle states for high-speed sampling, map matching, keep screen awake, and log size.
* `matrixScenario`: Active operational scenario (`scenario1` to `scenario4`).
* `cachedTilesCount`: Active number of map tiles persisted in IndexedDB.

---

## 14. Configuration

* [`vite.config.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/vite.config.ts): Configures Vite dev server with `@vitejs/plugin-react` and `@tailwindcss/vite`.
* [`package.json`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/package.json): NPM scripts (`dev`, `build`, `lint`, `preview`) and package dependencies.
* [`.oxlintrc.json`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/.oxlintrc.json): Oxlint static analysis rules.
* [`netlify.toml`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/netlify.toml) & [`vercel.json`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/vercel.json): Single Page Application rewrite rules for cloud deployment.

---

## 15. Environment Variables

* No secret environment variables or API keys are required.
* OSRM and Nominatim public API endpoints are hardcoded in `locationService.ts` with fallback handling.

---

## 16. Dependencies

| Package | Version | Purpose |
| --- | --- | --- |
| `react` / `react-dom` | `^19.2.8` | UI component framework |
| `react-router-dom` | `^7.18.3` | SPA client-side page routing |
| `leaflet` | `^1.9.4` | Interactive mapping engine |
| `lucide-react` | `^1.38.0` | UI icon set |
| `tailwindcss` / `@tailwindcss/vite` | `^4.3.3` | Utility-first CSS styling framework |
| `oxlint` | `^1.79.0` | High-performance linter |
| `vite` | `^5.4.11` | Development server & production bundler |

---

## 17. Error Handling

* **OSRM Outages / Offline:** `LocationService.calculateRoute()` catches fetch errors or invalid API responses and seamlessly invokes `generateFallbackRoute()` to create a Haversine straight-line polyline.
* **Geocoding Failures:** `searchLocation()` falls back to `OFFLINE_POI_DATABASE` if offline or Nominatim fails.
* **IndexedDB Failures:** `TileCacheService` safely catches IndexedDB exceptions and returns `null` or an SVG placeholder tile URL.
* **iOS WebKit Sensor Block:** `SensorService.requestMotionPermission()` catches denied permissions and returns `false` without crashing the application.

---

## 18. Authentication & Authorization

* **Type:** Local mock fleet operator authentication.
* **Flow:** `LoginPage.tsx` validates inputs and calls `loginUser()` on `NavigationContext`.
* **State:** `isLoggedIn` boolean stored in React state. `logoutUser()` resets authentication.

---

## 19. Testing Architecture

* **Linting:** Configured with `oxlint` via `npm run lint`.
* **Type Checking:** Built-in TypeScript compilation verification via `tsc -b`.

---

## 20. Build & Run Instructions

```bash
# Install dependencies
npm install

# Start local development server (Vite)
npm run dev

# Run oxlint static analysis
npm run lint

# Build production distribution bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 21. Change Impact Map

| Requested Change | Primary Files Affected | Secondary / Dependent Files |
| --- | --- | --- |
| **Modify Dead Reckoning Filter / ZUPT** | [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/deadReckoningEngine.ts) | [`NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/NavigationHudPage.tsx), [`NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/context/NavigationContext.tsx) |
| **Modify Heading Fusion Logic** | [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/OrientationService.ts) | [`NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/NavigationHudPage.tsx) |
| **Modify Map Overlay or Custom Icons** | [`src/components/MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/MapView.tsx) | [`ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/ExplorePage.tsx), [`NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/NavigationHudPage.tsx), [`SummaryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/SummaryPage.tsx) |
| **Modify IndexedDB Tile Caching** | [`src/services/tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/tileCacheService.ts) | [`MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/components/MapView.tsx), [`NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/context/NavigationContext.tsx) |
| **Add New Navigation State Attribute** | [`src/types/navigation.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/types/navigation.ts) | [`NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/context/NavigationContext.tsx), Affected Pages |
| **Modify Routing or Geocoding APIs** | [`src/services/locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/services/locationService.ts) | [`ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/ExplorePage.tsx), [`RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/SIH%2026/src/pages/RouteSetupPage.tsx) |

---

## 22. "Where Should I Make This Change?" Guide

```text
Need to change UI layout / mobile frame?
→ src/components/MobileShell.tsx or src/components/TopHeader.tsx / BottomNav.tsx

Need to adjust Map polylines, markers, or rotation?
→ src/components/MapView.tsx

Need to adjust Dead Reckoning math or ZUPT threshold?
→ src/services/deadReckoningEngine.ts

Need to modify Compass / Gyro heading fusion weights?
→ src/services/OrientationService.ts

Need to adjust Nominatim search, LRU cache size, or POIs?
→ src/services/locationService.ts

Need to update IndexedDB tile caching or offline SVG placeholder?
→ src/services/tileCacheService.ts

Need to update global state attributes or context actions?
→ src/types/navigation.ts AND src/context/NavigationContext.tsx
```

---

## 23. Critical Invariants

1. **`NavigationProvider` Nesting:** `NavigationProvider` must wrap `App.tsx` router components; pages access state via `useNavigationContext()`.
2. **Shortest-Path Angle Smoothing:** Any compass or heading math must use `OrientationService.smoothHeading()` to prevent wrap-around spinning at 0°/360°.
3. **Coordinate Order Convention:** Leaflet expects coordinates as `[lat, lng]`. OSRM returns GeoJSON coordinates as `[lng, lat]`. Any routing code MUST convert GeoJSON `[lng, lat]` to `[lat, lng]` before saving to `RouteState`.
4. **Offline Resilience:** All network operations (Nominatim, OSRM, Map Tiles) must catch errors and fall back gracefully without breaking the map interface or raising unhandled exceptions.

---

## 24. Known Problems / Technical Debt

1. **Legacy CSS Rules:** `src/App.css` contains unused CSS classes from the initial Vite template starter.
2. **Debounce Timer Scope:** `searchDebounceTimer` in `locationService.ts` uses module-scoped variable state.
3. **Synthetic Telemetry Jitter:** Demo telemetry values in `NavigationContext` use simple `Math.random()` noise generation during interval callbacks.

---

## 25. Important Decisions

* **Decision:** Used Leaflet instead of Google Maps SDK.
  * *Reason:* Leaflet permits full custom `TileLayer` extension, enabling offline tile caching via IndexedDB.
* **Decision:** Pure Client-Side Sensor Processing.
  * *Reason:* Ensures 100 Hz dead reckoning calculation latency without network dependence inside tunnels.

---

## 26. AI Coding Instructions

1. **Always read `brain.md`** before making architectural changes.
2. **Preserve types in `src/types/navigation.ts`**. If adding a new field, update both `navigation.ts` and initial state in `NavigationContext.tsx`.
3. **Ensure coordinate order accuracy** (`[lat, lng]` for Leaflet).
4. **Run `npm run lint` & `npm run build`** to verify changes before concluding tasks.

---

## 27. Change Protocol for Future AI Agents

```text
User Request
 ↓
Identify Target Feature
 ↓
Read relevant section in brain.md
 ↓
Check Change Impact Map & "Where Should I Make This Change?" Guide
 ↓
Modify Target Files (keeping minimal safe scope)
 ↓
Run build verification (`npm run build`) & lint (`npm run lint`)
 ↓
Update brain.md if architecture or file responsibilities changed
```

---

## 28. Brain.md Maintenance Rules

This file is a **living project map**. Update `brain.md` whenever:
* New services, components, pages, or files are added/deleted.
* API endpoints or database schemas change.
* Core algorithms (ZUPT, heading fusion, kinematics) are modified.
* New dependencies are added to `package.json`.

---

## 29. Source of Truth Rules

* **Implementation Truth:** Actual source code in `src/`.
* **Configuration Truth:** `package.json`, `vite.config.ts`, `tsconfig.json`.
* **Context/Architectural Map:** `brain.md`.

*If code and `brain.md` differ, code wins and `brain.md` must be updated.*

---

# AI QUICK CONTEXT

```text
PROJECT: reckon-x (ReckonX Navigation)
STACK: React 19, TypeScript 6, Vite 5, TailwindCSS v4, Leaflet 1.9, Lucide React, Oxlint
ARCHITECTURE: Client-side SPA, Context API State, Service Modules, Leaflet Canvas Map, IndexedDB Tile Cache
MAIN ENTRY POINT: src/main.tsx -> src/App.tsx
IMPORTANT DIRECTORIES:
  - src/services/    : Core algorithms (deadReckoningEngine, OrientationService, locationService, tileCacheService, sensorService)
  - src/context/     : Global state (NavigationContext.tsx)
  - src/components/  : MapView, TelemetryChart, MobileShell, TopHeader, BottomNav, Toast
  - src/pages/       : 9 SPA pages (Splash, Login, Permissions, Explore, RouteSetup, NavigationHud, Telemetry, Summary, Profile)
CORE FEATURES: Tunnels & Low-GNSS Dead Reckoning, 100 Hz IMU Streaming, Multi-Source Heading Fusion, OSRM Routing + Haversine Fallback, IndexedDB Offline Map Caching, ZUPT Drift Suppression, 4 Matrix Scenarios.
DATABASE: IndexedDB ("IDR_Tile_Cache_DB", store: "tiles")
AUTH: Local Fleet Sign-In (NavigationContext)
MAIN DATA FLOW: Hardware Sensors -> Services -> NavigationContext -> React Pages -> MapView / Canvas Chart
MOST IMPORTANT FILES:
  - src/services/deadReckoningEngine.ts  (Kinematics, ZUPT, Haversine, LERP)
  - src/services/OrientationService.ts     (Multi-source heading fusion, shortest-path angle filter)
  - src/services/locationService.ts        (Nominatim geocoding, LRU cache, OSRM routing)
  - src/services/tileCacheService.ts       (IndexedDB tile storage & SVG offline placeholder)
  - src/components/MapView.tsx             (Leaflet IndexedDB tile layer & multi-trajectory polylines)
  - src/context/NavigationContext.tsx      (Central state provider)
COMMON CHANGE LOCATIONS:
  - Map overlays / icons -> MapView.tsx
  - Dead reckoning math -> deadReckoningEngine.ts
  - Compass / heading fusion -> OrientationService.ts
  - Geocoding / routing -> locationService.ts
  - Global app state -> navigation.ts & NavigationContext.tsx
CRITICAL RULES:
  - Leaflet uses [lat, lng] array pairs; OSRM returns [lng, lat] GeoJSON. Always swap order.
  - Angular smoothing must use smoothHeading() to avoid 355° -> 5° spin glitches.
  - All network API calls must fall back gracefully to offline database or Haversine routes.
TEST COMMAND: npm run lint
BUILD COMMAND: npm run build
RUN COMMAND: npm run dev
```
