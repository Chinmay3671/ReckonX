# ReckonX Navigation — Central Brain & Knowledge Map (`brain.md`)

This document is the **central architectural brain and knowledge map** for the **ReckonX Navigation** codebase. It provides complete context for AI coding agents and human developers regarding the system architecture, file responsibilities, data flows, core algorithms, state management, dependencies, data integrity standards, and decision guidelines.

---

## 1. Project Overview

* **Project Name:** `reckon-x` (ReckonX Navigation)
* **Main Purpose:** A production-grade, intelligent Dead Reckoning (DR) navigation system designed specifically for tunnels, underground corridors, urban canyons, and low/zero-GNSS signal environments.
* **Target Users/Actors:** Fleet Drivers, Autonomous/Teleoperated Vehicle Operators, Telematics Engineers, and Field Testers.
* **Core Principles & Integrity Standards:**
  * **Strict No Fake Data Standard:** No synthetic jitter, mock trajectories, `Math.random()` IMU streams, or simulated backend payloads. If hardware sensors are unavailable or GNSS is lost without prior motion, the UI honestly reflects waiting, zero, or unsupported states.
  * **Edge-First Autonomy:** The core navigation loop (kinematics, heading fusion, ZUPT, map caching) runs 100% locally on device without mandatory internet connection.
  * **Backend-Ready Modular Architecture:** Clean REST contracts and service layers behind clean abstractions, ready for instant live integration with fleet monitoring clouds when backend servers come online.
* **Core Features:**
  * **Hardware Sensor Streaming:** Direct ingestion of 3-axis Accelerometer, Gyroscope, and Magnetometer (Compass) data via W3C `DeviceMotionEvent` and `DeviceOrientationEvent` APIs with support for iOS WebKit permission workflows.
  * **Kalman & Dead Reckoning Engine:** Kinematic stepping integration, Haversine distance, Exponential Moving Average (EMA) position filtering, and Zero Velocity Update (ZUPT) stationary drift suppression.
  * **Multi-Source Heading Fusion Pipeline:** Speed-aware angular fusion combining Magnetometer compass bearing, GNSS track bearing, Trajectory azimuth, and Gyroscope angular rate with shortest-path angular interpolation to prevent 355° $\rightarrow$ 5° spin glitches.
  * **Dynamic Drivable Routing & Fallback:** Turn-by-turn route calculation via OSRM Public Routing API with seamless automatic fallback to Haversine straight-line polylines when offline.
  * **Location Search & Geocoding:** 400ms debounced Nominatim search with an in-memory 50-item LRU cache, reverse geocoding, and a built-in offline POI database.
  * **Offline Map Tile Caching:** Custom Leaflet `TileLayer` extension intercepting tile requests to persist and serve tiles via IndexedDB (`IDR_Tile_Cache_DB`), returning dynamically rendered SVG placeholder tiles on offline cache misses.
  * **Follow Mode & Viewport Separation:** Complete decoupling of location marker updates from map viewport controls. Manual panning or zooming switches Follow Mode to OFF without halting live GPS/DR marker tracking. Re-centering restores Follow Mode and navigation zoom.
  * **Dynamic Distance Unit Formatting:** Centralized metric-to-imperial converter (`formatKmDistance`, `formatDistanceMeters`) dynamically formatting distances in `km` or `mi` across all screens based on user preferences.
  * **Clean Local Mode & Auth Abstraction:** Streamlined local sign-in and development mode allowing immediate frontend testing while keeping backend service contracts decoupled for future API plug-in.
  * **4-Scenario Operational Matrix (Auto-Detected):**
    1. **Scenario 1:** `[GPS ON + Net ON]` Standard Online Navigation
    2. **Scenario 2:** `[GPS OFF + Net ON]` GNSS Outage / Tunnel Mode
    3. **Scenario 3:** `[GPS ON + Net OFF]` Pure Offline Satellite Mode
    4. **Scenario 4:** `[GPS OFF + Net OFF]` Pure Offline Dead Reckoning
  * **Multi-Trajectory Map Overlay:** Interactive Leaflet map visualizing Primary Road Polyline, AI DR Path (amber dashed), and Raw INS Drift Path (red transparent). Supports North-Up and Head-Up (Follow Vehicle) camera modes.
  * **Real-time Live Telemetry & Waveform:** Real-time visual Canvas graph plotting X/Y/Z accelerometer vectors, live event log stream, and sensor diagnostic tables.
  * **Trip Analytics & Log Export:** Post-trip benchmark summary dashboard with genuine CSV telemetry log generation computed strictly from recorded session points.
  * **Our Solution Showcase:** 8-stage interactive architectural pipeline view detailing client-side edge computing vs. planned cloud AI/ML models.
* **Major Technologies:**
  * **Frontend:** React 19, TypeScript 6, Vite 5, React Router DOM 7, TailwindCSS v4 (`@tailwindcss/vite`), Leaflet 1.9, Lucide React icons, Oxlint.
  * **Storage:** Browser IndexedDB (`IDR_Tile_Cache_DB`), in-memory LRU cache, and `localStorage` for frontend settings.
  * **APIs:** HTML5 Geolocation API, W3C DeviceMotion & DeviceOrientation APIs, OpenStreetMap Nominatim API, OSRM Routing API, Backend-ready REST contracts.
  * **Backend/Database:** Autonomous client-side edge architecture with complete proposed contracts ready for future centralized fleet server integration.

---

## 2. Project Architecture

```text
User / Vehicle Hardware Sensors (Accel, Gyro, Compass, GPS)
                        ↓
            W3C Hardware Browser APIs
 (Geolocation API, DeviceMotionEvent, DeviceOrientationEvent)
                        ↓
          Low-Level Service & Config Layer
 ┌────────────────────────────────────────────────────────┐
 │ - config/mapConfig.ts (OSM, Nominatim, OSRM endpoints) │
 │ - config/apiConfig.ts (Backend base URL & endpoints)   │
 │ - services/api/ (apiClient, auth, profile, tracking)   │
 │ - services/SensorService (Streams & WebKit permissions)│
 │ - services/LocationService (Nominatim, OSRM, POIs)     │
 │ - services/OrientationService (Heading Fusion)         │
 │ - services/DeadReckoningEngine (ZUPT, Kinematics, EMA) │
 │ - services/TileCacheService (IndexedDB Tile Store)     │
 │ - services/LogExportService (CSV telemetry exporter)   │
 │ - utils/distanceFormatter.ts (KM/Miles conversions)    │
 └────────────────────────────────────────────────────────┘
                        ↓
            Global Context Layer (`NavigationContext`)
  (Holds SensorStatus, RouteState, TelemetryData, Settings,
   TrackingSession, SensorEventsStream, Tile Cache Counts)
                        ↓
             UI Layout & Component Layer
 ┌────────────────────────────────────────────────────────┐
 │ - MobileShell (Responsive smartphone frame)            │
 │ - MapView (Leaflet multi-trajectory canvas & Follow)   │
 │ - TelemetryChart (HTML5 Canvas accelerometer graph)    │
 │ - TopHeader / BottomNav / Toast                        │
 └────────────────────────────────────────────────────────┘
                        ↓
                    Application Pages
 (SplashPage → LoginPage → PermissionsPage → ExplorePage →
  RouteSetupPage → NavigationHudPage → TelemetryPage →
  SummaryPage → ProfilePage → OurSolutionPage)
```

---

## 3. Complete Project Tree

```text
reckon-x/
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
    ├── assets/                     # Static graphics and icons
    ├── config/                     # Centralized Configurations
    │   ├── apiConfig.ts            # Backend endpoints and API_BASE_URL config
    │   └── mapConfig.ts            # Centralized OSM, Nominatim, & OSRM provider URLs
    ├── components/                 # Reusable UI components
    │   ├── BottomNav.tsx           # Tab bar footer (Explore, Route, Telemetry, Solution, Profile)
    │   ├── MapView.tsx             # Interactive Leaflet map with IndexedDB caching, Follow Mode, & OSM attribution
    │   ├── MobileShell.tsx         # Responsive mobile container frame
    │   ├── TelemetryChart.tsx      # Real-time HTML5 canvas acceleration chart
    │   ├── Toast.tsx               # Floating notification toast banner
    │   └── TopHeader.tsx           # Header bar with back buttons and title
    ├── context/                    # React Context State Management
    │   └── NavigationContext.tsx   # Central Navigation Provider & Context definition
    ├── pages/                      # View router pages
    │   ├── ExplorePage.tsx         # Destination search & interactive map pin selection
    │   ├── LoginPage.tsx           # Clean operator sign-in & local development mode
    │   ├── NavigationHudPage.tsx   # Real-time Turn-by-Turn navigation HUD & kinematic DR engine
    │   ├── OurSolutionPage.tsx     # Architectural pipeline & planned backend overview
    │   ├── PermissionsPage.tsx     # Hardware sensor & GPS permission checklist
    │   ├── ProfilePage.tsx         # Local operator profile, system settings, & log/cache clearing
    │   ├── RouteSetupPage.tsx      # Drivable route selector & origin/destination configuration
    │   ├── SplashPage.tsx          # Startup hardware diagnostic & loading screen
    │   ├── SummaryPage.tsx         # Post-trip analytics report & CSV log exporter
    │   └── TelemetryPage.tsx       # Live sensor stream inspector & zero-point calibration
    ├── services/                   # Business logic & core algorithm engine modules
    │   ├── api/                    # Backend Service Abstraction Layer
    │   │   ├── apiClient.ts        # HTTP client handling 400, 401, 403, 404, 500, timeouts
    │   │   ├── authService.ts      # Authentication & session token management
    │   │   ├── profileService.ts   # Operator profile & backend stats integration
    │   │   ├── trackingService.ts  # Live GPS session streaming contracts
    │   │   └── telemetryService.ts # Sensor batch telemetry & analytics contracts
    │   ├── deadReckoningEngine.ts  # Kinematic stepping, ZUPT, Haversine, LERP & EMA filters
    │   ├── locationService.ts      # Nominatim search, LRU cache, OSRM routing & geocoding
    │   ├── logExportService.ts     # Genuine CSV telemetry log generation & download
    │   ├── OrientationService.ts   # Multi-source heading fusion & shortest-path angular filter
    │   ├── sensorService.ts        # Browser motion/orientation listeners & WebKit permission handlers
    │   └── tileCacheService.ts     # IndexedDB tile cache store & offline unavailable placeholder
    ├── types/                      # TypeScript interface and type declarations
    │   └── navigation.ts           # Core navigation domain types (RouteState, RouteOption, RouteStep, TelemetryData, Scenario, etc.)
    └── utils/                      # Helper Utilities
        ├── distanceFormatter.ts    # Centralized accurate KM/Miles distance formatter
        └── routeProgress.ts        # Accurate road polyline projection & remaining distance calculator
```

---

## 4. File Responsibility Map

| File | Responsibility | Depends On | Used By | Important Exported Symbols |
| --- | --- | --- | --- | --- |
| [`src/config/mapConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/mapConfig.ts) | Centralized map & geocoding provider configuration | None | `MapView.tsx`, `locationService.ts` | `MAP_CONFIG` |
| [`src/config/apiConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/apiConfig.ts) | Centralized backend API endpoints & base URL | None | API Service Layer | `API_CONFIG` |
| [`src/services/api/apiClient.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/apiClient.ts) | Robust HTTP client handling 400, 401, 403, 404, 409, 500, timeouts & pending backend | `apiConfig.ts` | API Services | `apiClient`, `ApiException` |
| [`src/services/api/authService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/authService.ts) | Backend authentication, tokens, & session management | `apiClient.ts` | `LoginPage.tsx`, `NavigationContext.tsx` | `AuthService` |
| [`src/services/api/profileService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/profileService.ts) | Backend driver profile & vehicle telemetry statistics | `apiClient.ts` | `ProfilePage.tsx` | `ProfileService` |
| [`src/services/api/trackingService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/trackingService.ts) | Live GPS & DR session streaming contracts | `apiClient.ts` | `NavigationContext.tsx`, `NavigationHudPage.tsx` | `TrackingService`, `RecordedGPSPoint` |
| [`src/services/api/telemetryService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/telemetryService.ts) | High-rate sensor batch ingestion and analytics contracts | `apiClient.ts` | Services, Context | `TelemetryService`, `AnalyticsService` |
| [`src/services/logExportService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/logExportService.ts) | Exports genuine collected session telemetry to CSV | None | `NavigationContext.tsx`, `SummaryPage.tsx` | `LogExportService` |
| [`src/types/navigation.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/types/navigation.ts) | Defines all TypeScript domain interfaces and types | `trackingService.ts` | All files | `RouteOption`, `RouteStep`, `OperationalMatrixScenario`, `SensorStatus`, `RouteState`, `TelemetryData`, `SettingsState`, `UserProfile`, `NavigationContextType` |
| [`src/utils/distanceFormatter.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/distanceFormatter.ts) | Centralized KM/Miles distance unit converter | None | Context, Pages, MapView | `formatKmDistance`, `formatDistanceMeters` |
| [`src/utils/routeProgress.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/routeProgress.ts) | Projects vehicle position onto polyline segments to compute genuine remaining road distance | `deadReckoningEngine.ts` | `NavigationHudPage.tsx`, `NavigationContext.tsx` | `calculateRemainingRoadDistance` |
| [`src/context/NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/context/NavigationContext.tsx) | Central React State Provider for global route, real telemetry, sensors, matrix scenarios, & tile cache | `navigation.ts`, `LocationService`, `SensorService`, `TileCacheService`, `LogExportService`, `distanceFormatter.ts` | `App.tsx`, all pages and components | `NavigationProvider`, `useNavigationContext` |
| [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/deadReckoningEngine.ts) | Performs Dead Reckoning kinematics, ZUPT drift suppression, Haversine distance, LERP & EMA smoothing | None | `LocationService`, `NavigationContext`, `NavigationHudPage`, `routeProgress.ts` | `DeadReckoningEngine` |
| [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/OrientationService.ts) | Multi-source heading fusion pipeline, forward bearing calculations, shortest-path angular smoothing | None | `NavigationHudPage` | `OrientationService` |
| [`src/services/locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) | Handles Nominatim search with 400ms debounce & 50-item LRU cache, reverse geocoding, OSRM multi-route alternatives & steps | `deadReckoningEngine.ts`, `mapConfig.ts` | `NavigationContext`, `ExplorePage`, `RouteSetupPage` | `LocationService` |
| [`src/services/sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/sensorService.ts) | Low-level listener wrapper for browser `devicemotion` and `deviceorientation` with iOS WebKit permission handlers | None | `NavigationContext`, `NavigationHudPage` | `SensorService` |
| [`src/services/tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/tileCacheService.ts) | Manages map tile storage/retrieval in IndexedDB (`IDR_Tile_Cache_DB`) and serves offline unavailable placeholders | None | `NavigationContext`, `MapView` | `TileCacheService` |
| [`src/components/MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MapView.tsx) | Leaflet map renderer with 60 FPS requestAnimationFrame visual interpolation, OSRM alternative polylines, Follow Mode, & Head-Up rotation | `TileCacheService`, `mapConfig.ts`, Leaflet | `ExplorePage`, `NavigationHudPage`, `SummaryPage` | `MapView` |
| [`src/components/MobileShell.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MobileShell.tsx) | Container layout framing views inside a mobile smartphone viewport | None | All Pages | `MobileShell` |
| [`src/components/TelemetryChart.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/TelemetryChart.tsx) | HTML5 Canvas real-time rolling 3-axis accelerometer waveform plot for genuine sensor data | `NavigationContext.tsx` | `TelemetryPage` | `TelemetryChart` |
| [`src/components/BottomNav.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/BottomNav.tsx) | Bottom tab bar for top-level app page routing (Explore, Route, Telemetry, Solution, Profile) | React Router DOM | `MobileShell` footers | `BottomNav` |
| [`src/components/TopHeader.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/TopHeader.tsx) | Header bar with title, subtitle, and navigation back button | React Router DOM | Pages | `TopHeader` |
| [`src/components/Toast.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/Toast.tsx) | Global popup toast notification alert banner | `NavigationContext` | `App.tsx` | `Toast` |
| [`src/pages/SplashPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/SplashPage.tsx) | Hardware diagnostic checklist & initial boot screen | `MobileShell` | Route `/` | `SplashPage` |
| [`src/pages/LoginPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/LoginPage.tsx) | Clean local sign-in form & local development mode (backend-ready abstraction) | `NavigationContext`, `MobileShell` | Route `/login` | `LoginPage` |
| [`src/pages/PermissionsPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/PermissionsPage.tsx) | Explicit hardware sensor and GPS permission requester page | `NavigationContext`, `TopHeader`, `MobileShell` | Route `/permissions` | `PermissionsPage` |
| [`src/pages/ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/ExplorePage.tsx) | Interactive destination search, pin placement, and map view | `NavigationContext`, `LocationService`, `MapView`, `BottomNav`, `MobileShell` | Route `/explore` | `ExplorePage` |
| [`src/pages/RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/RouteSetupPage.tsx) | Origin/destination configuration & drivable route option selector | `NavigationContext`, `LocationService`, `TopHeader`, `BottomNav`, `MobileShell`, `distanceFormatter.ts` | Route `/route-setup` | `RouteSetupPage` |
| [`src/pages/NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/NavigationHudPage.tsx) | Active navigation HUD, multi-trajectory map, Follow Mode controls, live fusion ticker, & DR kinematic stepping | `NavigationContext`, `OrientationService`, `DeadReckoningEngine`, `SensorService`, `MapView`, `MobileShell`, `distanceFormatter.ts` | Route `/navigation` | `NavigationHudPage` |
| [`src/pages/TelemetryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/TelemetryPage.tsx) | Real-time live hardware sensor stream inspector & zero-point calibration | `NavigationContext`, `TelemetryChart`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/telemetry` | `TelemetryPage` |
| [`src/pages/SummaryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/SummaryPage.tsx) | Post-trip benchmark analysis & genuine CSV log exporter | `NavigationContext`, `MapView`, `TopHeader`, `MobileShell`, `distanceFormatter.ts` | Route `/summary` | `SummaryPage` |
| [`src/pages/ProfilePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/ProfilePage.tsx) | Local operator profile, system settings, & log/tile cache clearing | `NavigationContext`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/profile` | `ProfilePage` |
| [`src/pages/OurSolutionPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/OurSolutionPage.tsx) | System architecture breakdown and planned backend integration details | `TopHeader`, `BottomNav`, `MobileShell` | Route `/solution` | `OurSolutionPage` |
| [`src/utils/distanceFormatter.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/distanceFormatter.ts) | Centralized KM/Miles distance formatter with accurate conversions | None | Context, Navigation HUD, RouteSetup, Summary, Explore | `formatDistanceMeters`, `formatKmDistance`, `getDistanceUnitLabel` |

---

## 5. Dependency / Relationship Map

```text
[App.tsx]
  ├── Wraps with <NavigationProvider> (from NavigationContext.tsx)
  ├── Registers BrowserRouter routes:
  │    ├── "/"            → <SplashPage />
  │    ├── "/login"       → <LoginPage />
  │    ├── "/permissions" → <PermissionsPage />
  │    ├── "/explore"     → <ExplorePage />
  │    ├── "/route-setup" → <RouteSetupPage />
  │    ├── "/navigation"  → <NavigationHudPage />
  │    ├── "/telemetry"   → <TelemetryPage />
  │    ├── "/summary"     → <SummaryPage />
  │    ├── "/profile"     → <ProfilePage />
  │    └── "/solution"    → <OurSolutionPage />
  └── Renders <Toast />

[NavigationContext.tsx]
  ├── Uses LocationService      → (Calls calculateRoute, getCurrentLocation)
  ├── Uses SensorService        → (Subscribes to devicemotion & deviceorientation)
  ├── Uses TileCacheService     → (Interacts with IndexedDB tile storage)
  ├── Uses LogExportService     → (Generates CSV logs from genuine points)
  └── Uses distanceFormatter.ts → (Accurately formats route distance strings in km/mi)

[LocationService.ts]
  ├── Reads MAP_CONFIG (config/mapConfig.ts)
  ├── Calls OSRM API (https://router.project-osrm.org) with strict coordinate validation, AbortSignal support, and error translation
  ├── Calls Nominatim API (https://nominatim.openstreetmap.org) with type/class metadata and LRU cache
  └── Uses DeadReckoningEngine → (For Haversine distance diagnostics without fake road generation)

[MapView.tsx]
  ├── Reads MAP_CONFIG.OSM_TILE_URL and MAP_CONFIG.OSM_ATTRIBUTION
  ├── Extends L.TileLayer → (IndexedDBTileLayer reads/writes through TileCacheService)
  ├── Implements 60 FPS requestAnimationFrame visual interpolation for vehicle marker & Head-Up map rotation
  ├── Renders dynamic directional vehicle navigation arrow with centered transform-origin (0° = North)
  ├── Implements Follow Mode decoupling (pan/zoom disables follow, re-center restores follow)
  └── Renders Leaflet map canvas with custom Markers, Alternative Route Polylines, & visible attribution

[NavigationHudPage.tsx]
  ├── Reads state from NavigationContext
  ├── Uses SensorService → (Direct devicemotion stream)
  ├── Uses OrientationService → (fuseHeading algorithm with stationary drift protection and honest state detection)
  ├── Uses DeadReckoningEngine → (stepKinematics, ZUPT, Haversine calculations)
  ├── Uses routeProgress.ts → (Accurate polyline segment projection for remaining road distance)
  ├── Uses distanceFormatter.ts → (Formats remaining distance dynamically in km or mi)
  └── Renders <MapView mode="navigation" />
```

---

## 6. Complete Application Flow

### Startup Flow

```text
Application Starts (index.html -> main.tsx -> App.tsx)
 ↓
NavigationProvider initializes state, loads localStorage preferences, and attaches online/offline window listeners
 ↓
IndexedDB Connection Opened (IDR_Tile_Cache_DB) & Tile Count Refreshed
 ↓
Automatic GPS Location Acquisition Triggered (acquireLiveLocation)
 ↓
User lands on SplashPage ("/") → Real browser API checks run (Geolocation, Motion, Orientation, IndexedDB)
 ↓
User clicks "Continue to Sign-In" → Navigates to LoginPage ("/login")
```

### User Navigation Lifecycle Flow

```text
1. Sign In (LoginPage)
   ↓ User inputs operator credentials or clicks "Continue in Local Mode"
   ↓ Local frontend validation passes & loginUser() sets local session
2. Permissions Check (PermissionsPage)
   ↓ User grants motion & orientation permissions (supporting iOS WebKit flows)
   ↓ grantAllSensors() requests hardware access
3. Explore & Destination Selection (ExplorePage)
   ↓ User searches location via Nominatim OR taps Leaflet map OR drags red destination pin
   ↓ LocationService.searchLocation() [debounced 400ms, checks LRU Cache / Offline POIs]
   ↓ LocationService.calculateRoute() [queries OSRM API -> falls back to Haversine if offline]
   ↓ RouteState updated in NavigationContext
4. Route Setup (RouteSetupPage)
   ↓ User reviews OSRM road route or offline straight-line fallback route (distances formatted in km/mi)
   ↓ User clicks "Start Live Navigation HUD" → startTrackingSession() initialized
5. Active Navigation HUD (NavigationHudPage)
   ↓ Real GPS watchPosition records actual vehicle position fixes
   ↓ 10 Hz Ticker runs OrientationService.fuseHeading()
   ↓ When GNSS is lost > 3 sec: DeadReckoningEngine.stepKinematics() takes over with real sensor linear acceleration
   ↓ Follow Mode decoupled: manual pan/zoom frees the camera while marker continues tracking live
   ↓ Re-center restores Follow Mode & navigation zoom
   ↓ Operational Matrix Scenario (1-4) auto-detected from real network & GPS status
6. Post-Trip Analysis (SummaryPage)
   ↓ Displays completed trajectory, genuine calculated metrics formatted in km/mi (distance, duration, speeds, DR ratios)
   ↓ User can export genuine telemetry data to CSV via LogExportService
```

---

## 7. Feature-by-Feature Flow

### 1. Hardware Diagnostic & Sensor Setup
* **Files:** [`SplashPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/SplashPage.tsx), [`PermissionsPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/PermissionsPage.tsx), [`sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/sensorService.ts).
* **Behavior:** Checks browser motion support (`hasMotionSupport`), orientation support (`hasOrientationSupport`), and handles WebKit explicit user gesture permission requests (`requestMotionPermission`, `requestOrientationPermission`).
* **Validation:** Returns booleans for each sensor state (`accel`, `gyro`, `compass`, `gnss`).

### 2. Destination Search & Geocoding
* **Files:** [`ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/ExplorePage.tsx), [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts), [`mapConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/mapConfig.ts).
* **Behavior:**
  1. Checks 50-item in-memory LRU search cache (`lruSearchCache`).
  2. If network is offline, immediately searches `OFFLINE_POI_DATABASE`.
  3. If online, issues a 400ms debounced `fetch` request to Nominatim API.
  4. User can also tap anywhere on the Leaflet map to trigger `reverseGeocode(lat, lng)` or drag destination pin.

### 3. Dynamic Drivable Routing & Fallback
* **Files:** [`RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/RouteSetupPage.tsx), [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts), [`deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/deadReckoningEngine.ts).
* **Behavior:** Queries OSRM Public Driving API (`MAP_CONFIG.OSRM_BASE_URL`). Converts GeoJSON `[lng, lat]` coordinates into Leaflet `[lat, lng]` polyline coordinates. If unreachable or offline, calls `generateFallbackRoute()`, constructing a 15-step straight-line LERP route using Haversine distance calculations (clearly labeled as "Offline approximate path").

### 4. Turn-by-Turn Guidance, Heading Fusion & Follow Mode
* **Files:** [`NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/NavigationHudPage.tsx), [`OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/OrientationService.ts), [`MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MapView.tsx).
* **Behavior:** Runs a 10 Hz ticker executing `fuseHeading()`. Weighting adapts dynamically based on vehicle speed:
  * **High Speed (> 5 km/h):** Blends 70% GNSS Track Bearing + 30% Trajectory Bearing.
  * **Medium Speed (2–5 km/h):** Blends Magnetometer Compass and Trajectory.
  * **Stationary ($\le$ 2 km/h):** Smoothly transitions to Hardware Compass.
  * **GNSS Outage:** Integrates Gyroscope Z rate ($\text{deg/sec} \times dt$) smoothed against trajectory azimuth.
  * **Follow Mode Behavior:** Initial state is Follow ON. Manual drags/pans/zooms disable Follow Mode, allowing full route inspection while marker updates smoothly. Re-center button re-engages Follow Mode at navigation zoom (16).

### 5. IndexedDB Tile Caching & Offline Map Fallback
* **Files:** [`tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/tileCacheService.ts), [`MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MapView.tsx).
* **Behavior:** `IndexedDBTileLayer` intercepts Leaflet `createTile()`. Looks up tile URL in IndexedDB store `tiles`. On cache hit, assigns Base64 data URL to `img.src`. On cache miss while online, fetches tile, converts to Base64, and saves to IndexedDB. On cache miss while offline, serves an SVG placeholder tile with the honest label "Map tile unavailable offline".

---

## 8. Database Architecture

The application uses **Browser IndexedDB** for local persistent map tile caching and **Browser `localStorage`** for user preferences.

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
| GET | `https://nominatim.openstreetmap.org/search` | Geocoding Search | `format=json&q=<query>&limit=5` | JSON Array of `SearchResult` (`lat`, `lon`, `display_name`) | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) |
| GET | `https://nominatim.openstreetmap.org/reverse` | Reverse Geocoding | `format=json&lat=<lat>&lon=<lng>` | JSON Object with `display_name` | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) |
| GET | `https://router.project-osrm.org/route/v1/driving/{coords}` | Drivable Routing | `{startLng},{startLat};{destLng},{destLat}?overview=full&geometries=geojson` | GeoJSON route geometry, distance (m), duration (s) | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) |

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
* **Routing:** `react-router-dom` v7 with hashless browser routes (`/`, `/login`, `/permissions`, `/explore`, `/route-setup`, `/navigation`, `/telemetry`, `/summary`, `/profile`, `/solution`).

---

## 11. Backend-Ready Architecture & Proposed Contracts

The application features a clean, separated service layer ready for future backend deployment.

| Service Module | Endpoint | Description | Status |
| --- | --- | --- | --- |
| `AuthService` | `/auth/login`, `/auth/logout`, `/auth/refresh` | Authentication, token storage, and session handling | Frontend Contract Ready |
| `ProfileService` | `/profile` | Operator profile and statistics | Frontend Contract Ready |
| `TrackingService` | `/tracking/start`, `/tracking/points`, `/tracking/end` | Live GPS & DR session streaming | Frontend Contract Ready |
| `TelemetryService`| `/telemetry/stream` | High-rate IMU batch streaming | Frontend Contract Ready |
| `AnalyticsService`| `/analytics/summary` | Centralized trip benchmark summary | Frontend Contract Ready |

---

## 12. Important Algorithms / Business Logic

### 1. Multi-Source Heading Fusion Pipeline (`fuseHeading`)
* **Location:** [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/OrientationService.ts#L92)
* **Purpose:** Calculates a smooth, unified vehicle heading angle from noisy hardware sensors.
* **Logic:**
  1. Evaluates vehicle speed and GNSS availability.
  2. Blends Magnetometer compass, GNSS track bearing, trajectory azimuth, and integrated Gyroscope Z angular rate ($\text{deg/sec} \times dt$).
  3. Passes raw target heading through `smoothHeading()` for 10 Hz shortest-path angular filtering.

### 2. Shortest-Path Angular Interpolation (`smoothHeading`)
* **Location:** [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/OrientationService.ts#L56)
* **Purpose:** Prevents 355° $\rightarrow$ 5° angular spin glitches when crossing the North boundary.
* **Logic:** Calculates rotational arc difference (`normTarget - normCurrent`). If difference > 180°, subtracts 360°; if < -180°, adds 360°. Smooths with factor $\alpha=0.2$.

### 3. Zero Velocity Update (ZUPT) Filter (`checkZuptStationary`)
* **Location:** [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/deadReckoningEngine.ts#L73)
* **Purpose:** Detects stationary vehicle state to halt integration drift accumulation during stops.
* **Logic:** Evaluates absolute linear acceleration ($|a| < 0.25 \text{ m/s}^2$). If sustained for $\ge 0.5 \text{ seconds}$, sets stationary flag `isZuptActive = true` and freezes speed to `0`.

### 4. Metric / Imperial Distance Formatting (`formatKmDistance`, `formatDistanceMeters`)
* **Location:** [`src/utils/distanceFormatter.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/distanceFormatter.ts)
* **Purpose:** Ensures accurate, unit-consistent display of distances without mutating underlying meters/km.
* **Conversion:** $1 \text{ mile} = 1609.344 \text{ meters}$, $1 \text{ km} = 1000 \text{ meters}$.

---

## 13. State Management

All shared state lives in [`src/context/NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/context/NavigationContext.tsx):

* `sensorStatus`: Hardware states (`accel`, `gyro`, `compass`, `gnss`, `hasMotionHardware`, `hasOrientationHardware`).
* `routeState`: Current route origins, destinations, coordinates, distances, durations, error strings, and fallback flags.
* `telemetry`: Real-time vehicle speed, drift error (m), ETA, acceleration vector ($a_x, a_y, a_z$), orientation angles ($\text{pitch}, \text{roll}, \text{yaw}$), sample rate (Hz), and stream flags.
* `settings`: Persisted frontend preferences (`highSpeedPolling`, `mapMatching`, `keepScreenAwake`, `autoCenterVehicle`, `speedUnit`, `distanceUnit`, `offlineLogs`).
* `matrixScenario`: Auto-detected operational scenario (`scenario1` to `scenario4`).
* `trackingSession`: Active session metadata, genuine GPS/DR points array, elapsed duration, max/average speeds, and DR ratios.
* `sensorEventsStream`: Rolling buffer of the latest 20 real device sensor events.
* `cachedTilesCount`: Active number of map tiles persisted in IndexedDB.

---

## 14. Configuration

* [`src/config/mapConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/mapConfig.ts): Map, OSM tile, and geocoding endpoints.
* [`src/config/apiConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/apiConfig.ts): Backend API base URL and REST endpoint contracts.
* [`vite.config.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/vite.config.ts): Configures Vite dev server with `@vitejs/plugin-react` and `@tailwindcss/vite`.
* [`package.json`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/package.json): NPM scripts (`dev`, `build`, `lint`, `preview`) and package dependencies.
* [`.oxlintrc.json`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/.oxlintrc.json): Oxlint static analysis rules.
* [`netlify.toml`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/netlify.toml) & [`vercel.json`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/vercel.json): SPA rewrite rules for cloud deployment.

---

## 15. Environment Variables

* `VITE_API_BASE_URL`: (Optional) Base URL for backend API (Default: `https://api.reckonx-navigation.local/v1`).
* All core edge algorithms function entirely client-side without mandatory environment keys.

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
* **Backend Service Decoupling:** Authentication abstraction allows seamless local development login while preserving API service contracts for future server connection.

---

## 18. Testing Architecture

* **Linting:** Configured with `oxlint` via `npm run lint`.
* **Type Checking:** Built-in TypeScript compilation verification via `tsc -b`.

---

## 19. Build & Run Instructions

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

## 20. Critical Invariants

1. **`NavigationProvider` Nesting:** `NavigationProvider` must wrap `App.tsx` router components; pages access state via `useNavigationContext()`.
2. **Shortest-Path Angle Smoothing:** Any compass or heading math must use `OrientationService.smoothHeading()` to prevent wrap-around spinning at 0°/360°.
3. **Coordinate Order Convention:** Leaflet expects coordinates as `[lat, lng]`. OSRM returns GeoJSON coordinates as `[lng, lat]`. Any routing code MUST convert GeoJSON `[lng, lat]` to `[lat, lng]` before saving to `RouteState`.
4. **Follow Mode Viewport Decoupling:** Location marker updates must never forcibly override the user's manual map viewport when Follow Mode is OFF. Re-centering restores Follow Mode and resets navigation zoom (16).
5. **No Fake Data Standard:** No synthetic jitter, mock users, or fake metrics. If real data is missing, display honest waiting/empty/unsupported states.

---

# AI QUICK CONTEXT

```text
PROJECT: reckon-x (ReckonX Navigation)
STACK: React 19, TypeScript 6, Vite 5, TailwindCSS v4, Leaflet 1.9, Lucide React, Oxlint
ARCHITECTURE: Client-side Edge SPA, Context API State, Service Modules, Leaflet Canvas Map, IndexedDB Tile Cache, REST API Contracts
MAIN ENTRY POINT: src/main.tsx -> src/App.tsx
IMPORTANT DIRECTORIES:
  - src/config/      : mapConfig.ts, apiConfig.ts
  - src/services/api/: apiClient, authService, profileService, trackingService, telemetryService
  - src/services/    : deadReckoningEngine, OrientationService, locationService, tileCacheService, sensorService, logExportService
  - src/utils/       : distanceFormatter.ts
  - src/context/     : Global state (NavigationContext.tsx)
  - src/components/  : MapView, TelemetryChart, MobileShell, TopHeader, BottomNav, Toast
  - src/pages/       : 10 SPA pages (Splash, Login, Permissions, Explore, RouteSetup, NavigationHud, Telemetry, Summary, Profile, OurSolution)
CORE FEATURES: Tunnels & Low-GNSS Dead Reckoning, 100 Hz IMU Streaming, Multi-Source Heading Fusion, Follow Mode Decoupling, Dynamic KM/Miles Formatting, OSRM Routing + Haversine Fallback, IndexedDB Offline Map Caching, ZUPT Drift Suppression, Auto-Detected 4 Matrix Scenarios, Genuine CSV Log Export.
DATABASE: IndexedDB ("IDR_Tile_Cache_DB", store: "tiles") & localStorage for settings
TEST COMMAND: npm run lint
BUILD COMMAND: npm run build
RUN COMMAND: npm run dev
```
