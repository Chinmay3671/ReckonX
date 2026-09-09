# ReckonX Navigation — Central Brain & Knowledge Map (`brain.md`)

This document is the **central architectural brain and knowledge map** for the **ReckonX Navigation** codebase. It provides complete, verified context for AI coding agents and human developers regarding system architecture, file responsibilities, data flows, core algorithms, state management, dependencies, data integrity standards, and decision guidelines.

---

## 1. Project Overview

* **Project Name:** `reckon-x` (ReckonX Navigation)
* **Main Purpose:** A production-grade, intelligent Dead Reckoning (DR) navigation system designed specifically for tunnels, underground corridors, urban canyons, and low/zero-GNSS signal environments.
* **Target Users/Actors:** Fleet Drivers, Autonomous/Teleoperated Vehicle Operators, Telematics Engineers, and Field Testers.
* **Core Principles & Integrity Standards:**
  * **Strict No Fake Data Standard:** In **LIVE DEVICE MODE** (the system default), the UI never generates synthetic jitter, mock trajectories, `Math.random()` IMU streams, or fabricated sensor/GPS values. If hardware sensors or GNSS signals are unavailable or permissions are denied, the system honestly reports unavailable/waiting states (`--`, `0`, or `prompt/denied`).
  * **Simulation / Mock Mode Distinction:** The application cleanly distinguishes between `LIVE DEVICE MODE` (`systemMode = 'live'`) and `SIMULATION / MOCK MODE` (`systemMode = 'simulation'`). In Live Device Mode, only real browser/hardware sensor and GPS streams are ingested.
  * **Edge-First Autonomy:** The core navigation loop (kinematics, heading fusion, ZUPT, map caching, route tracking) runs 100% locally on the client device without requiring a mandatory active cloud connection.
  * **Backend-Ready Modular Architecture:** Clean REST contracts and service layers behind clean abstractions, ready for instant live integration with fleet monitoring clouds when backend servers come online.

* **Core Features:**
  * **Real-Time Hardware Sensor Streaming:** Direct ingestion of 3-axis Accelerometer ($a_x, a_y, a_z$, magnitude), 3-axis Gyroscope ($g_x, g_y, g_z$, magnitude), Device Orientation ($\alpha, \beta, \gamma$, heading), and Generic Sensor Magnetometer ($m_x, m_y, m_z$) via W3C `DeviceMotionEvent`, `DeviceOrientationEvent`, and `Magnetometer` APIs with iOS WebKit permission workflows. Timestamps and rolling sample rates (targeting up to ~100 Hz, platform-dependent) are computed in real time.
  * **Continuous Real GPS Location Pipeline:** Continuous GPS fix acquisition via HTML5 Geolocation API (`watchPosition` / `getCurrentPosition`) with strict coordinate bounds validation, chronological timestamp verification, and reverse geocoding.
  * **Dead Reckoning & Kinematic Engine:** IMU linear acceleration integration, Zero Velocity Update (ZUPT) stationary drift suppression ($|a| < 0.25 \text{ m/s}^2$ for $\ge 0.5\text{s}$), Haversine distance, and Exponential Moving Average (EMA) position filtering for smooth GNSS re-anchoring.
  * **Multi-Source Heading Fusion Pipeline:** Speed-aware angular fusion combining Magnetometer compass bearing, GNSS track bearing, Trajectory azimuth, and integrated Gyroscope angular rate with shortest-path angular interpolation to prevent 355° $\rightarrow$ 5° spin glitches.
  * **Vehicle-Specific Multi-Profile Routing:** Dedicated profile routing for **Car** (driving road network, one-ways, turn restrictions), **Bike** (cycling paths, secondary roads), and **Walking** (footpaths, walkways, pedestrian zones). Vehicle selection controls geometry, distance, ETA, turn instructions, and alternative options. Strict profile enforcement prevents silent fallback to Car routing.
  * **Concurrency & Race-Condition Guarded Route Service:** Request-ID tracking, in-flight request cancellation via `AbortController` / `AbortSignal`, and a profile-aware in-memory route cache (`origin + dest + vehicleProfile`).
  * **Location Search & Geocoding:** 400ms debounced Nominatim search with an in-memory 50-item LRU cache, reverse geocoding with spatial hash caching (~50m), and a built-in offline POI database.
  * **Decoupled Map Camera & Free Exploration:** Complete architectural decoupling of the physical GPS/DR location state from the Leaflet map camera viewport. Free map exploration (pan, drag, pinch-zoom) immediately disengages Follow Mode without halting live marker tracking. Re-centering smoothly re-engages Follow Mode.
  * **Single-Initialization Leaflet Map Lifecycle:** Map canvas initialized once and preserved across high-frequency sensor/GPS ticks. Only visual markers, polylines, and rotation transforms update dynamically. `fitBounds` executes strictly on initial route creation or explicit user request.
  * **Offline Map Tile Caching:** Custom Leaflet `TileLayer` extension intercepting tile requests to persist and serve tiles via IndexedDB (`IDR_Tile_Cache_DB`), returning dynamically rendered SVG placeholder tiles on offline cache misses.
  * **Dynamic Distance Unit Formatting:** Centralized metric-to-imperial converter (`formatKmDistance`, `formatDistanceMeters`) dynamically formatting distances in `km` or `mi` across all screens based on user preferences.
  * **4-Scenario Operational Matrix (Auto-Detected):**
    1. **Scenario 1:** `[GPS ON + Net ON]` Standard Online Navigation
    2. **Scenario 2:** `[GPS OFF + Net ON]` GNSS Outage / Tunnel Dead Reckoning Mode
    3. **Scenario 3:** `[GPS ON + Net OFF]` Pure Offline Satellite Mode
    4. **Scenario 4:** `[GPS OFF + Net OFF]` Pure Offline Dead Reckoning
  * **Multi-Trajectory Map Overlay:** Interactive Leaflet map visualizing Primary Road Polyline, AI DR Path (amber dashed), and Raw INS Drift Path (red transparent). Supports North-Up and Head-Up (Follow Vehicle) camera modes.
  * **Real-time Live Telemetry & Waveform:** Real-time visual Canvas graph plotting X/Y/Z accelerometer vectors, live event log stream, and sensor diagnostic tables.
  * **Trip Analytics & Log Export:** Post-trip benchmark summary dashboard with genuine CSV telemetry log generation computed strictly from recorded session points.
  * **Our Solution Showcase:** 8-stage interactive architectural pipeline view detailing client-side edge computing vs. planned cloud AI/ML models.

* **Major Technologies:**
  * **Frontend:** React 19 (`^19.2.8`), TypeScript 6 (`~6.0.2`), Vite 5 (`^5.4.11`), React Router DOM 7 (`^7.18.3`), TailwindCSS v4 (`^4.3.3`, `@tailwindcss/vite`), Leaflet 1.9 (`^1.9.4`), Lucide React icons (`^1.38.0`), Oxlint (`^1.79.0`).
  * **Storage:** Browser IndexedDB (`IDR_Tile_Cache_DB`, store: `tiles`), in-memory LRU search cache, spatial reverse-geocode cache, and `localStorage` for frontend settings.
  * **APIs:** HTML5 Geolocation API, W3C DeviceMotion & DeviceOrientation APIs, Generic Sensor Magnetometer API, OpenStreetMap Nominatim Geocoding API, OpenStreetMap multi-profile OSRM Routing APIs (`routed-car`, `routed-bike`, `routed-foot`), Backend-ready REST contracts.
  * **Backend/Database:** Autonomous client-side edge architecture with complete proposed contracts ready for future centralized fleet server integration.

---

## 2. Project Architecture

### Main System Data Flow

```text
REAL PHYSICAL DEVICE HARDWARE
  │
  ├── GPS / GNSS Location (navigator.geolocation.watchPosition)
  │      ↓
  │   LocationService (coordinate validation & timestamp validation)
  │      ↓
  │   CurrentLocationData { lat, lng, accuracy, speed, bearing, timestamp, source: 'gps' }
  │      ↓
  ├── Motion Sensors (DeviceMotionEvent: 3-axis Accel + 3-axis Gyro)
  │      ↓
  ├── Orientation Sensors (DeviceOrientationEvent: alpha, beta, gamma, heading)
  │      ↓
  └── Magnetometer Sensor (Generic Sensor API: magX, magY, magZ)
         ↓
      SensorService (stream subscriptions & WebKit permissions)
         ↓
      NavigationContext (Central State: currentLocation, realSensors, telemetry)
         ↓
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Sensor Fusion & Kinematics Engines                                     │
  │  - OrientationService: Heading Fusion (Compass + GNSS + Gyro + Azimuth)│
  │  - DeadReckoningEngine: Kinematic Stepping + ZUPT Filter + Haversine   │
  └────────────────────────────────────────────────────────────────────────┘
         ↓
  Central Navigation State
  ┌─────────────────────────────────┬──────────────────────────────────────┐
  │                                 │                                      │
  ▼                                 ▼                                      ▼
Map Rendering (MapView)       Routing Engine (RouteService)          Live Telemetry & Logs
- Single Leaflet init         - Profile-aware (Car/Bike/Walk)        - Accelerometer Canvas
- Decoupled Camera vs GPS     - Multi-endpoint OSRM dispatch         - 4/4 Scenario Matrix
- Smooth 60 FPS LERP Marker   - Normalized Route Result              - Active Session Points
- Follow Mode ON/OFF          - Concurrency AbortSignal              - Genuine CSV Exporter
```

### Multi-Profile Routing Data Flow

```text
User Route Setup (Origin + Destination + Vehicle Type [Car | Bike | Walking])
                         │
                         ▼
             RouteService.calculateRoute()
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [Profile: Car]   [Profile: Bike]  [Profile: Walking]
        │                │                │
  routed-car OSRM   routed-bike OSRM  routed-foot OSRM
  (Highway/Street)  (Cycleways/Paths) (Footways/Sidewalks)
        │                │                │
        └────────────────┼────────────────┘
                         ▼
             Response Normalization
  (Converts GeoJSON [lng,lat] -> Leaflet [lat,lng], extracts steps & alternatives)
                         │
                         ▼
               NormalizedRouteResult
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Route Polyline   Route Options Card   Turn-by-Turn HUD
   on Leaflet Map   (Distance, ETA, via) (Step Guidance)
```

---

## 3. Complete Project Tree

```text
reckon-x/
├── .gitignore                      # Git ignore patterns
├── .oxlintrc.json                  # Oxlint linter rules
├── brain.md                        # Central architectural brain & knowledge map
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
    │   └── mapConfig.ts            # Centralized OSM, Nominatim, & Multi-Profile OSRM URLs
    ├── components/                 # Reusable UI components
    │   ├── BottomNav.tsx           # Tab bar footer (Explore, Route, Telemetry, Solution, Profile)
    │   ├── MapView.tsx             # Decoupled Leaflet map, 60 FPS marker LERP, Follow Mode, IndexedDB caching
    │   ├── MobileShell.tsx         # Responsive mobile container frame (max 430px)
    │   ├── TelemetryChart.tsx      # Real-time HTML5 canvas acceleration chart
    │   ├── Toast.tsx               # Global notification toast banner
    │   └── TopHeader.tsx           # Header bar with back buttons and title
    ├── context/                    # React Context State Management
    │   └── NavigationContext.tsx   # Central Navigation Provider & Context (Sensors, GPS, Route, Matrix)
    ├── pages/                      # View router pages
    │   ├── ExplorePage.tsx         # Destination search, pin placement, and interactive map exploration
    │   ├── LoginPage.tsx           # Clean operator sign-in & local development mode
    │   ├── NavigationHudPage.tsx   # Turn-by-Turn navigation HUD, live fusion ticker, DR kinematics
    │   ├── OurSolutionPage.tsx     # Architectural pipeline & planned backend overview
    │   ├── PermissionsPage.tsx     # Hardware sensor & GPS permission checklist
    │   ├── ProfilePage.tsx         # Local operator profile, system settings, & log/cache clearing
    │   ├── RouteSetupPage.tsx      # Multi-profile vehicle routing, alternative selection, origin/destination
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
    │   ├── locationService.ts      # Nominatim search, LRU cache, reverse geocoding, GPS watcher
    │   ├── logExportService.ts     # Genuine CSV telemetry log generation & download
    │   ├── OrientationService.ts   # Multi-source heading fusion & shortest-path angular filter
    │   ├── routeService.ts         # Multi-profile routing service (Car, Bike, Walking), caching, normalization
    │   ├── sensorService.ts        # Browser motion/orientation listeners & WebKit permission handlers
    │   └── tileCacheService.ts     # IndexedDB tile cache store & offline unavailable placeholder
    ├── types/                      # TypeScript interface and type declarations
    │   └── navigation.ts           # Core navigation domain types (RouteState, CurrentLocationData, RealSensorData, etc.)
    └── utils/                      # Helper Utilities
        ├── distanceFormatter.ts    # Centralized accurate KM/Miles distance formatter
        └── routeProgress.ts        # Road polyline projection & remaining distance calculator
```

---

## 4. File Responsibility Map

| File | Responsibility | Depends On | Used By | Important Exported Symbols |
| --- | --- | --- | --- | --- |
| [`src/config/mapConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/mapConfig.ts) | Centralized map, tile, Nominatim, and multi-profile OSRM provider URLs | None | `MapView.tsx`, `locationService.ts`, `routeService.ts` | `MAP_CONFIG` |
| [`src/config/apiConfig.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/config/apiConfig.ts) | Centralized backend API endpoints & base URL | None | API Service Layer | `API_CONFIG` |
| [`src/services/api/apiClient.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/apiClient.ts) | Robust HTTP client handling 400, 401, 403, 404, 409, 500, timeouts & pending backend | `apiConfig.ts` | API Services | `apiClient`, `ApiException` |
| [`src/services/api/authService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/authService.ts) | Backend authentication, tokens, & session management | `apiClient.ts` | `LoginPage.tsx`, `NavigationContext.tsx` | `AuthService` |
| [`src/services/api/profileService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/profileService.ts) | Backend driver profile & vehicle telemetry statistics | `apiClient.ts` | `ProfilePage.tsx` | `ProfileService` |
| [`src/services/api/trackingService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/trackingService.ts) | Live GPS & DR session streaming contracts | `apiClient.ts` | `NavigationContext.tsx`, `NavigationHudPage.tsx` | `TrackingService`, `RecordedGPSPoint` |
| [`src/services/api/telemetryService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/api/telemetryService.ts) | High-rate sensor batch ingestion and analytics contracts | `apiClient.ts` | Services, Context | `TelemetryService`, `AnalyticsService` |
| [`src/services/logExportService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/logExportService.ts) | Exports genuine collected session telemetry to CSV | None | `NavigationContext.tsx`, `SummaryPage.tsx` | `LogExportService` |
| [`src/types/navigation.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/types/navigation.ts) | Defines all TypeScript domain interfaces and types | `trackingService.ts` | All files | `CurrentLocationData`, `RealSensorData`, `RouteOption`, `RouteStep`, `NormalizedRouteResult`, `RouteState`, `TelemetryData`, `SettingsState`, `UserProfile`, `NavigationContextType`, `VehicleType` |
| [`src/utils/distanceFormatter.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/distanceFormatter.ts) | Centralized KM/Miles distance unit converter | None | Context, Pages, MapView | `formatKmDistance`, `formatDistanceMeters`, `getDistanceUnitLabel` |
| [`src/utils/routeProgress.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/routeProgress.ts) | Projects vehicle position onto polyline segments to compute genuine remaining road distance | `deadReckoningEngine.ts` | `NavigationHudPage.tsx`, `NavigationContext.tsx` | `calculateRemainingRoadDistance` |
| [`src/services/routeService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/routeService.ts) | Dedicated multi-profile routing engine (Car, Bike, Walking), concurrency handling, profile-aware caching, response normalization | `mapConfig.ts`, `deadReckoningEngine.ts`, `navigation.ts` | `NavigationContext.tsx`, `locationService.ts` | `RouteService`, `RouteRequestOptions` |
| [`src/services/locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) | Geocoding search (Nominatim + 400ms debounce + LRU cache), reverse geocoding, GPS location watcher & validation | `mapConfig.ts`, `deadReckoningEngine.ts`, `routeService.ts` | `NavigationContext`, `ExplorePage`, `RouteSetupPage` | `LocationService`, `SearchResult` |
| [`src/services/sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/sensorService.ts) | Real hardware browser listeners for `devicemotion`, `deviceorientation`, and `Magnetometer` with iOS WebKit permissions | None | `NavigationContext`, `NavigationHudPage` | `SensorService`, `RawMotionSample`, `RawOrientationSample`, `RawMagnetometerSample` |
| [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/OrientationService.ts) | Multi-source heading fusion pipeline, forward bearing calculations, shortest-path angular smoothing | None | `NavigationHudPage`, `NavigationContext` | `OrientationService`, `HeadingFusionInputs` |
| [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/deadReckoningEngine.ts) | Performs Dead Reckoning kinematics, ZUPT drift suppression, Haversine distance, LERP & EMA smoothing | None | `NavigationContext`, `NavigationHudPage`, `routeProgress.ts`, `routeService.ts` | `DeadReckoningEngine`, `DRPositionEstimate` |
| [`src/services/tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/tileCacheService.ts) | Manages map tile storage/retrieval in IndexedDB (`IDR_Tile_Cache_DB`) and serves offline unavailable placeholders | None | `NavigationContext`, `MapView` | `TileCacheService` |
| [`src/context/NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/context/NavigationContext.tsx) | Central React State Provider: real sensors, GPS location, route state, telemetry, matrix scenarios, & tile cache | `navigation.ts`, `LocationService`, `RouteService`, `SensorService`, `TileCacheService`, `LogExportService`, `distanceFormatter.ts` | `App.tsx`, all pages and components | `NavigationProvider`, `useNavigationContext` |
| [`src/components/MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MapView.tsx) | Leaflet map renderer: single-init lifecycle, decoupled camera/location, 60 FPS vehicle marker LERP, Follow Mode, IndexedDB caching | `TileCacheService`, `mapConfig.ts`, Leaflet | `ExplorePage`, `RouteSetupPage`, `NavigationHudPage`, `SummaryPage` | `MapView` |
| [`src/components/MobileShell.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MobileShell.tsx) | Container layout framing views inside a mobile smartphone viewport (max-width 430px) | None | All Pages | `MobileShell` |
| [`src/components/TelemetryChart.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/TelemetryChart.tsx) | HTML5 Canvas real-time rolling 3-axis accelerometer waveform plot for genuine sensor data | `NavigationContext.tsx` | `TelemetryPage` | `TelemetryChart` |
| [`src/components/BottomNav.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/BottomNav.tsx) | Bottom tab bar for top-level app page routing (Explore, Route, Telemetry, Solution, Profile) | React Router DOM | `MobileShell` footers | `BottomNav` |
| [`src/components/TopHeader.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/TopHeader.tsx) | Header bar with title, subtitle, and navigation back button | React Router DOM | Pages | `TopHeader` |
| [`src/components/Toast.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/Toast.tsx) | Global popup toast notification alert banner | `NavigationContext` | `App.tsx` | `Toast` |
| [`src/pages/SplashPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/SplashPage.tsx) | Hardware diagnostic checklist & initial boot screen | `MobileShell` | Route `/` | `SplashPage` |
| [`src/pages/LoginPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/LoginPage.tsx) | Clean local sign-in form & local development mode (backend-ready abstraction) | `NavigationContext`, `MobileShell` | Route `/login` | `LoginPage` |
| [`src/pages/PermissionsPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/PermissionsPage.tsx) | Explicit hardware sensor and GPS permission requester page | `NavigationContext`, `TopHeader`, `MobileShell` | Route `/permissions` | `PermissionsPage` |
| [`src/pages/ExplorePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/ExplorePage.tsx) | Interactive destination search, pin placement, and decoupled map view | `NavigationContext`, `LocationService`, `MapView`, `BottomNav`, `MobileShell` | Route `/explore` | `ExplorePage` |
| [`src/pages/RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/RouteSetupPage.tsx) | Multi-profile vehicle routing, alternative routes, origin/destination configuration | `NavigationContext`, `LocationService`, `TopHeader`, `BottomNav`, `MobileShell`, `distanceFormatter.ts` | Route `/route-setup` | `RouteSetupPage` |
| [`src/pages/NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/NavigationHudPage.tsx) | Active navigation HUD, multi-trajectory map, Follow Mode controls, live fusion ticker, & DR kinematic stepping | `NavigationContext`, `OrientationService`, `DeadReckoningEngine`, `SensorService`, `MapView`, `MobileShell`, `distanceFormatter.ts` | Route `/navigation` | `NavigationHudPage` |
| [`src/pages/TelemetryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/TelemetryPage.tsx) | Real-time live hardware sensor stream inspector & zero-point calibration | `NavigationContext`, `TelemetryChart`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/telemetry` | `TelemetryPage` |
| [`src/pages/SummaryPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/SummaryPage.tsx) | Post-trip benchmark analysis & genuine CSV log exporter | `NavigationContext`, `MapView`, `TopHeader`, `MobileShell`, `distanceFormatter.ts` | Route `/summary` | `SummaryPage` |
| [`src/pages/ProfilePage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/ProfilePage.tsx) | Local operator profile, system settings, & log/tile cache clearing | `NavigationContext`, `TopHeader`, `BottomNav`, `MobileShell` | Route `/profile` | `ProfilePage` |
| [`src/pages/OurSolutionPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/OurSolutionPage.tsx) | System architecture breakdown and planned backend integration details | `TopHeader`, `BottomNav`, `MobileShell` | Route `/solution` | `OurSolutionPage` |

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
  ├── Uses LocationService      → (Subscribes to continuous GPS watchPosition, reverseGeocode, Nominatim)
  ├── Uses RouteService         → (Calculates multi-profile routes for Car, Bike, Walking with AbortSignal)
  ├── Uses SensorService        → (Subscribes to real devicemotion, deviceorientation, magnetometer streams)
  ├── Uses TileCacheService     → (Interacts with IndexedDB tile storage)
  ├── Uses LogExportService     → (Generates genuine CSV logs from active tracking session points)
  └── Uses distanceFormatter.ts → (Accurately formats route distance strings in km/mi)

[RouteService.ts]
  ├── Reads MAP_CONFIG (config/mapConfig.ts)
  │    ├── CAR_BASE_URL: https://routing.openstreetmap.de/routed-car
  │    ├── CAR_FALLBACK_URL: https://router.project-osrm.org
  │    ├── BIKE_BASE_URL: https://routing.openstreetmap.de/routed-bike
  │    └── FOOT_BASE_URL: https://routing.openstreetmap.de/routed-foot
  ├── Uses DeadReckoningEngine  → (For Haversine distance validation)
  └── Normalizes OSRM GeoJSON [lng, lat] to Leaflet [lat, lng]

[MapView.tsx]
  ├── Reads MAP_CONFIG.OSM_TILE_URL and MAP_CONFIG.OSM_ATTRIBUTION
  ├── Extends L.TileLayer       → (IndexedDBTileLayer reads/writes through TileCacheService)
  ├── Single Leaflet Init       → (Initializes once, reuses canvas, observes resize via ResizeObserver)
  ├── 60 FPS Visual Loop        → (Smooth LERP interpolation for marker position & heading; does NOT force camera)
  ├── Follow Mode Decoupling    → (User drag/pan/zoom disables follow; Re-center button restores follow)
  └── Route Rendering           → (Draws active route & alternatives; fitBounds runs only on initial route load)

[NavigationHudPage.tsx]
  ├── Reads state from NavigationContext
  ├── Uses SensorService        → (Direct devicemotion stream)
  ├── Uses OrientationService   → (fuseHeading with GNSS, Compass, Gyro Z rate & Trajectory Azimuth)
  ├── Uses DeadReckoningEngine  → (stepKinematics, ZUPT, Haversine calculations during GNSS outage)
  ├── Uses routeProgress.ts     → (Projects vehicle onto polyline segments for remaining road distance)
  └── Renders <MapView mode="navigation" />
```

---

## 6. Real-Time Sensor Architecture

### 1. Hardware Sensor Ingestion
The system ingests real hardware sensors via standard browser APIs in [`src/services/sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/sensorService.ts):

* **3-Axis Accelerometer:** Real linear acceleration ($a_x, a_y, a_z$ in $\text{m/s}^2$) and total magnitude via `DeviceMotionEvent.acceleration` (fallback to `accelerationIncludingGravity`).
* **3-Axis Gyroscope:** Angular rotation rates around X ($g_x / \beta$), Y ($g_y / \gamma$), and Z ($g_z / \alpha$) in $\text{deg/s}$ and total magnitude via `DeviceMotionEvent.rotationRate`.
* **Orientation / Compass:** Absolute device orientation angles ($\alpha$ yaw $0\text{--}360^\circ$, $\beta$ pitch $-180\text{--}180^\circ$, $\gamma$ roll $-90\text{--}90^\circ$) via `DeviceOrientationEvent` and `webkitCompassHeading`.
* **Magnetometer:** Direct magnetic field vector ($m_x, m_y, m_z$ in $\mu\text{T}$) when supported via W3C Generic Sensor `Magnetometer` API.
* **Sampling Target & Rates:** Sensors are processed in real time with high-frequency listeners targeting **up to ~100 Hz** (actual rate depends on device hardware, operating system, and browser throttling). A rolling 1-second counter calculates the exact real-time frequency displayed as `sampleRateHz`.

### 2. Live Device Mode vs. Simulation / Mock Mode
* **Live Device Mode (`systemMode = 'live'`):** **Default mode.** In this mode, no synthetic or random values (`Math.random()`) are generated. If a physical sensor is unavailable, its status is marked false/unsupported and values remain honest (`null` or `0`).
* **Simulation / Mock Mode (`systemMode = 'simulation'`):** Optional diagnostic mode explicitly designated for development on non-mobile desktop hardware without physical sensors.

---

## 7. Real GPS Location Pipeline & Location Validation

### 1. GPS Pipeline
The source of truth for physical location in Live Device Mode is the device's actual GNSS hardware:

```text
HTML5 Geolocation API (watchPosition with enableHighAccuracy: true)
                         ↓
             LocationService.startLocationWatch()
                         ↓
  ┌────────────────────────────────────────────────────────┐
  │ Coordinate & Chronological Validation                  │
  │ 1. Latitude in [-90, 90], Longitude in [-180, 180]     │
  │ 2. Timestamp ts >= lastAcceptedTimestamp (no stale fixes)│
  │ 3. Finite, non-NaN coordinate checks                   │
  └────────────────────────────────────────────────────────┘
                         ↓
             Reverse Geocoding (Nominatim / Cache)
                         ↓
             CurrentLocationData Object:
             {
               latitude: number,
               longitude: number,
               accuracy: number (meters),
               altitude: number (meters),
               speed: number (km/h),
               bearing: number (0-360 deg),
               timestamp: number (ms),
               address: string,
               source: 'gps' | 'dead_reckoning' | 'manual' | 'simulation',
               isStale: boolean,
               ageSec: number
             }
                         ↓
             NavigationContext State (Central Source of Truth)
                         ↓
       Map Rendering / Routing / Active Navigation / Telemetry
```

### 2. Location Validation & Coordinate Order Rules
* **Bounds Check:** Latitude must be within $[-90, 90]$ and Longitude within $[-180, 180]$.
* **Chronological Validation:** New GPS updates must have `timestamp >= lastAcceptedTimestamp`. Cached or out-of-order updates are discarded.
* **Coordinate Ordering Conventions:**
  * **Leaflet Map Rendering:** Expects `[latitude, longitude]`.
  * **OSRM Routing URLs:** Expects `{longitude},{latitude};{destLongitude},{destLatitude}` in the URL string (`coordsStr = ${startLng},${startLat};${destLng},${destLat}`).
  * **GeoJSON Route Responses:** Returns `[longitude, latitude]`. The `RouteService` explicitly inverts this to `[latitude, longitude]` before storing in `RouteState`.

### 3. Fixed Location Behavior & Origin Management
* In **Live Device Mode**, the current GPS fix is the single source of truth.
* Default/demo coordinates (`MAP_CONFIG.DEFAULT_CENTER = [19.0760, 72.8777]`, Mumbai) are strictly used for initial camera centering before a physical GPS fix is obtained.
* **Manual Origin Protection:** If the user manually selects or searches an origin address, `isOriginManualRef` prevents continuous GPS updates from overwriting the manual origin.
* **"Use My Location" Action:** Clicking "Use My Location" or refreshing GPS explicitly resets `isOriginManualRef = false` and re-anchors the route origin to current physical GPS.

---

## 8. Multi-Profile Vehicle Routing Architecture

The application provides dedicated, profile-specific routing for three distinct modes: **Car**, **Bike**, and **Walking**.

```text
Route Setup UI
      │
      ▼
Origin + Destination + VehicleProfile ('car' | 'bike' | 'walking')
      │
      ▼
RouteService.calculateRoute({ origin, destination, vehicleProfile, alternatives, signal, requestId })
      │
      ├── Car Profile:
      │     Primary:   https://routing.openstreetmap.de/routed-car
      │     Fallback:  https://router.project-osrm.org
      │     Speed:     ~50 km/h baseline
      │     Rules:     Highway/road network, one-ways, turn restrictions
      │
      ├── Bike Profile:
      │     Provider:  https://routing.openstreetmap.de/routed-bike
      │     Speed:     ~18 km/h baseline
      │     Rules:     Cycleways, secondary roads; avoids non-bike expressways
      │     STRICT:    Never falls back to Car routing
      │
      └── Walking Profile:
            Provider:  https://routing.openstreetmap.de/routed-foot
            Speed:     ~4.8 km/h baseline
            Rules:     Footpaths, walkways, pedestrian zones; avoids motorways
            STRICT:    Never falls back to Car routing
      │
      ▼
Response Normalization (NormalizedRouteResult)
      │
      ▼
Profile-Aware Route Cache (Key includes :vehicleProfile)
      │
      ▼
NavigationContext (Replaces geometry, distance, ETA, steps, alternatives, profileLabel)
```

### 1. Route Normalization Structure (`NormalizedRouteResult`)
All routing providers normalize into a uniform data structure independent of underlying APIs:

```typescript
export interface NormalizedRouteResult {
  vehicleProfile: 'car' | 'bike' | 'walking';
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lat, lng] array
  steps: RouteStep[];
  alternatives: RouteOption[];
  selectedRoute: RouteOption;
  routes: RouteOption[];
  summary: string;
  source: string;
  providerUrl: string;
  requestId: number;
  profileLabel: string;
  routeTypeLabel: string;
}
```

### 2. Profile-Aware Route Cache
The in-memory route cache key combines coordinates and the vehicle profile:
$$\text{CacheKey} = \text{startLat},\text{startLng}\rightarrow\text{destLat},\text{destLng}:\text{vehicleProfile}$$
This guarantees a cached Car route is never accidentally returned when Bike or Walking is selected.

### 3. Route Alternatives & Vehicle Switching
* **Profile Consistency:** All alternative routes generated belong strictly to the selected vehicle profile.
* **Vehicle Switching Flow:** When the user switches vehicle profile (e.g. Car $\rightarrow$ Walking):
  1. Old routes and polylines are immediately invalidated.
  2. A new route calculation is dispatched to the profile-specific router.
  3. Route geometry, distance, ETA, turn instructions, and alternatives are replaced.
  4. Navigation HUD profile and speed references update accordingly.

---

## 9. Map Camera Architecture & Follow Mode

### 1. Viewport & Location Decoupling
Physical GPS position (`currentLocation`) and map camera viewport (`mapCamera`) are separate architectural states:
* **Location Marker:** Updates continuously at 60 FPS via `requestAnimationFrame` LERP interpolation whenever GPS or DR estimates arrive.
* **Map Camera:** Does **NOT** automatically reset or recenter during normal map exploration.

### 2. Free Map Exploration vs. Follow Mode
* **Free Exploration (Follow Mode = OFF):** The user can freely pan, drag, pinch-zoom, and inspect the route. Any manual map interaction (`dragstart`, `zoomstart`, `movestart`) immediately switches Follow Mode to **OFF**. GPS updates update the vehicle marker icon only without calling `setView()`, `panTo()`, `flyTo()`, or `fitBounds()`.
* **Follow Mode = ON:** Default state during active turn-by-turn navigation HUD or when the user explicitly clicks **Center on My Location**. In Follow Mode, the map camera smoothly glides (`map.panTo(vPos, { animate: false })`) to follow the vehicle marker.
* **Route Fitting (`fitBounds`):** `fitBounds()` executes **strictly once** when a new route is first calculated or when the user explicitly taps "Show Entire Route". It never runs continuously on GPS ticks.

### 3. Single Map Lifecycle & Resize Handling
* The Leaflet map instance is initialized **once** on component mount and preserved. High-frequency sensor/GPS updates never recreate the Leaflet map instance.
* Dynamic container size adjustments are handled via a `ResizeObserver` calling `map.invalidateSize()`.

---

## 10. Navigation Heading Fusion & Dead Reckoning

### 1. Multi-Source Heading Fusion (`OrientationService.fuseHeading`)
Combines four complementary orientation sources based on vehicle dynamics:
* **High Speed ($> 5\text{ km/h}$):** Blends 70% GNSS Track Bearing + 30% Trajectory Azimuth.
* **Medium Speed ($2\text{--}5\text{ km/h}$):** Blends Magnetometer Compass and Trajectory Azimuth.
* **Stationary ($\le 2\text{ km/h}$):** Transitions smoothly to Hardware Compass.
* **GNSS Outage:** Integrates Gyroscope Z angular rate ($\text{deg/s} \times dt$) smoothed against trajectory azimuth.
* **Shortest-Path Angle Smoothing (`smoothHeading`):** Normalizes angles to $[0, 360)$ and calculates the shortest rotational arc to prevent 355° $\rightarrow$ 5° spin glitches across the North boundary.

### 2. Dead Reckoning Engine (`DeadReckoningEngine`)
* **GNSS Available:** GPS is the primary position source; IMU linear acceleration assists with high-rate smoothing.
* **GNSS Outage ($> 3\text{s}$ or Stale GPS):** Dead Reckoning becomes the primary position estimator via `stepKinematics()`, integrating linear acceleration along the fused heading vector with ZUPT stationary drift suppression.
* **GNSS Recovery:** When a valid GPS fix returns, `emaFilterPosition()` applies Exponential Moving Average position smoothing ($\alpha=0.25$) to re-anchor the DR state without visual jumping.

---

## 11. Database Architecture

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
* **Reverse Geocode Cache:** `reverseGeocodeCache` (Map<string, string>, spatial hash ~50m precision, max size: 100).
* **Route Cache:** `RouteService.routeCache` (Map<string, NormalizedRouteResult>, TTL: 10 minutes, key includes vehicle profile).
* **Offline POI Database:** `OFFLINE_POI_DATABASE` (Static fallback array of key transit infrastructure).

---

## 12. External API Documentation

| Method | Endpoint | Purpose | Request Parameters | Response | Implementation File |
| --- | --- | --- | --- | --- | --- |
| GET | `https://nominatim.openstreetmap.org/search` | Geocoding Search | `format=json&q=<query>&limit=5` | JSON Array of `SearchResult` (`lat`, `lon`, `display_name`) | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) |
| GET | `https://nominatim.openstreetmap.org/reverse` | Reverse Geocoding | `format=json&lat=<lat>&lon=<lng>` | JSON Object with `display_name` | [`locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) |
| GET | `https://routing.openstreetmap.de/routed-car/route/v1/driving/{coords}` | Car Primary Routing | `{startLng},{startLat};{destLng},{destLat}?overview=full&geometries=geojson&alternatives=true&steps=true` | GeoJSON driving routes, distance (m), duration (s), steps | [`routeService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/routeService.ts) |
| GET | `https://router.project-osrm.org/route/v1/driving/{coords}` | Car Fallback Routing | Same as above | Same as above | [`routeService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/routeService.ts) |
| GET | `https://routing.openstreetmap.de/routed-bike/route/v1/driving/{coords}` | Bike / Cycling Routing | Same as above | GeoJSON cycling routes, distance (m), duration (s), steps | [`routeService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/routeService.ts) |
| GET | `https://routing.openstreetmap.de/routed-foot/route/v1/driving/{coords}` | Walking / Pedestrian Routing | Same as above | GeoJSON walking routes, distance (m), duration (s), steps | [`routeService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/routeService.ts) |

---

## 13. State Management

All shared application state lives in [`src/context/NavigationContext.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/context/NavigationContext.tsx):

* `currentLocation`: Physical device location fix (`latitude`, `longitude`, `accuracy`, `altitude`, `speed`, `bearing`, `timestamp`, `source`, `address`, `isStale`, `ageSec`).
* `realSensors`: Real-time hardware measurements ($a_x, a_y, a_z, g_x, g_y, g_z$, pitch, roll, yaw, heading, $m_x, m_y, m_z$, sample rate Hz, interval).
* `systemMode`: Active data mode (`live` vs. `simulation`).
* `isSensorsEnabled`: Sensor stream toggle state.
* `sensorStatus`: Hardware availability flags (`accel`, `gyro`, `compass`, `gnss`, `hasMotionHardware`, `hasOrientationHardware`, `gpsPermission`).
* `routeState`: Multi-profile route state (`origin`, `destination`, `startCoords`, `destCoords`, `vehicleType`, `routes`, `selectedRouteIndex`, `routeCoordinates`, `distanceKm`, `durationMin`, `steps`, `profileLabel`, `isCalculating`, `error`).
* `telemetry`: HUD telemetry data (`speed`, `drift`, `eta`, `remainingKm`, acceleration vectors, orientation angles, sample rate Hz).
* `settings`: User preferences (`highSpeedPolling`, `mapMatching`, `keepScreenAwake`, `autoCenterVehicle`, `speedUnit`, `distanceUnit`, `offlineLogs`).
* `matrixScenario`: Auto-detected operational scenario (`scenario1` to `scenario4`).
* `trackingSession`: Active session metadata, genuine recorded GPS/DR points array, speeds, and DR ratios.
* `sensorEventsStream`: Rolling buffer of the latest 20 real device sensor events.
* `cachedTilesCount`: Count of map tiles persisted in IndexedDB.

---

## 14. Change Impact Map

When making modifications to specific subsystems, refer to this exact file mapping:

| Area of Change | Primary Source File(s) | Impacted Components / Context |
| --- | --- | --- |
| **Map Camera & Viewport Behavior** | [`src/components/MapView.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/components/MapView.tsx) | Follow Mode, Zoom/Pan controls, Leaflet canvas |
| **GPS Acquisition & Validation** | [`src/services/locationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/locationService.ts) | `NavigationContext.tsx` (`currentLocation`), `PermissionsPage.tsx` |
| **Real Hardware Sensor Streaming** | [`src/services/sensorService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/sensorService.ts) | `NavigationContext.tsx` (`realSensors`), `TelemetryPage.tsx` |
| **Vehicle-Specific Multi-Profile Routing** | [`src/services/routeService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/routeService.ts) | `mapConfig.ts`, `NavigationContext.tsx` (`routeState`), `RouteSetupPage.tsx` |
| **Heading Fusion & Angular Math** | [`src/services/OrientationService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/OrientationService.ts) | `NavigationHudPage.tsx`, `MapView.tsx` (chevron rotation) |
| **Dead Reckoning & ZUPT Kinematics** | [`src/services/deadReckoningEngine.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/deadReckoningEngine.ts) | `NavigationHudPage.tsx`, `NavigationContext.tsx` |
| **Route Setup UI & Selection** | [`src/pages/RouteSetupPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/RouteSetupPage.tsx) | Vehicle selector, search inputs, route alternatives card |
| **Active Turn-by-Turn Navigation HUD** | [`src/pages/NavigationHudPage.tsx`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/pages/NavigationHudPage.tsx) | Step banner, speedometer, scenario badge, live fusion loop |
| **Tile Caching & Offline Storage** | [`src/services/tileCacheService.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/services/tileCacheService.ts) | `MapView.tsx`, `NavigationContext.tsx` (`cachedTilesCount`) |
| **Distance Units & Formatting** | [`src/utils/distanceFormatter.ts`](file:///c:/Users/chinm/OneDrive/Desktop/All%20in%20one/TY%20Files/copy%20sih26/src/utils/distanceFormatter.ts) | All pages displaying distance or remaining km/mi |

---

## 15. Known Critical Rules & Invariants

1. **Never use fake sensor data in LIVE DEVICE MODE:** When `systemMode = 'live'`, never generate synthetic jitter or random numbers. If hardware is absent or denied, report honestly.
2. **Never use hardcoded GPS coordinates as live location:** The physical device GPS is the sole live location source. Default coordinates are strictly fallbacks for initial camera positioning before a fix.
3. **GPS location state and map camera state must remain independent:** GPS updates must never forcibly override the user's manual map viewport when Follow Mode is OFF.
4. **GPS updates must not automatically recenter an actively explored map:** Never call `setView()`, `panTo()`, `flyTo()`, or `fitBounds()` on every GPS tick during free map exploration.
5. **Vehicle selection must control the actual routing profile:** Changing between Car, Bike, and Walking must invoke the corresponding routing backend, recalculate geometry, duration, distance, and steps.
6. **Never label a Car route as Walking or Bike:** Strict profile enforcement ensures routes reflect the chosen vehicle type.
7. **Route cache keys must include vehicle profile:** Cache keys must follow `origin->dest:vehicleProfile` to prevent cross-profile contamination.
8. **Route alternatives must use the same vehicle profile:** Never mix Car alternatives with Bike or Walking routes.
9. **Never silently fall back from walking/bike routing to a car route:** If a bike or walking route fails, return an honest error rather than substituting a driving route.
10. **Do not recreate the Leaflet map on every GPS or sensor update:** Initialize the map once and mutate layer overlays imperatively.
11. **Do not call `fitBounds` continuously:** `fitBounds()` runs strictly once on route calculation or upon explicit user button tap ("Show Entire Route").
12. **Preserve Leaflet `[lat, lng]` coordinate ordering:** Leaflet expects `[latitude, longitude]`.
13. **OSRM routing URLs require `{lng},{lat}` ordering:** When constructing OSRM query URLs, pass coordinates as `${startLng},${startLat};${destLng},${destLat}`.
14. **Shortest-Path Angle Smoothing:** Any compass or heading math must use `OrientationService.smoothHeading()` to prevent wrap-around spinning at 0°/360°.

---

## 16. Verification & Test Procedures

### Test 1: Live Hardware Sensor Verification
1. Run application on a real physical smartphone or mobile device over HTTPS/localhost.
2. Navigate to `/permissions` and grant Motion and Orientation permissions.
3. Open `/telemetry`:
   * Tilt and shake the device $\rightarrow$ verify $a_x, a_y, a_z$ waveform reacts dynamically.
   * Rotate device $\rightarrow$ verify gyroscope rates ($g_x, g_y, g_z$) and orientation angles update.
   * Verify timestamps advance and `sampleRateHz` displays genuine frequency (e.g. 50–100 Hz).

### Test 2: Real GPS Acquisition & Origin Sync
1. Open `/route-setup` with GPS enabled.
2. Verify origin automatically shows your current location address with `±accuracy` readout.
3. Walk or move to a new location $\rightarrow$ verify GPS coordinates and address update.
4. Type a custom origin address $\rightarrow$ verify manual origin is preserved and not overwritten by subsequent GPS fixes.
5. Tap **Use My Location** $\rightarrow$ verify origin snaps back to current GPS fix.

### Test 3: Map Exploration & Follow Mode Verification
1. Open `/explore` or `/navigation`.
2. Drag, pan, or zoom the map away from the vehicle marker:
   * Verify Follow Mode immediately switches to **OFF**.
   * Wait for GPS updates $\rightarrow$ verify vehicle marker moves, but map camera remains exactly where user placed it.
3. Tap **Center on My Location**:
   * Verify camera smoothly glides back to the vehicle marker and Follow Mode is re-engaged.
4. Pan the map again $\rightarrow$ verify Follow Mode disengages immediately.

### Test 4: Multi-Profile Routing Verification
1. Open `/route-setup` and set origin and destination.
2. Select **Car**:
   * Verify driving route geometry, driving ETA (~50 km/h baseline), and highway/road steps.
3. Select **Bike**:
   * Verify route recalculates, geometry changes to cycling paths/roads, distance/ETA updates (~18 km/h baseline), and steps reflect cycling instructions.
4. Select **Walking**:
   * Verify route recalculates, geometry routes via pedestrian footpaths, distance/ETA updates (~4.8 km/h baseline), and steps reflect walking instructions.

---

## 17. Build & Run Instructions

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

# AI QUICK CONTEXT

```text
PROJECT: reckon-x (ReckonX Navigation)
STACK: React 19, TypeScript 6, Vite 5, TailwindCSS v4 (@tailwindcss/vite), Leaflet 1.9, Lucide React, Oxlint
ARCHITECTURE: Client-side Edge SPA, React Context State, Multi-Profile OSRM Routing, Leaflet Canvas Map, IndexedDB Tile Cache, W3C Sensor Streaming, Dead Reckoning Engine
MAIN ENTRY POINT: src/main.tsx -> src/App.tsx
IMPORTANT DIRECTORIES & SERVICES:
  - src/services/routeService.ts        : Multi-profile routing (Car, Bike, Walking), concurrency handling, profile-aware cache
  - src/services/locationService.ts     : Real GPS watcher, coordinate validation, Nominatim geocoding & LRU cache
  - src/services/sensorService.ts       : Real browser hardware sensor streams (devicemotion, deviceorientation, magnetometer)
  - src/services/OrientationService.ts  : Multi-source heading fusion (Compass + GNSS + Gyro + Trajectory) & smoothHeading
  - src/services/deadReckoningEngine.ts : IMU kinematic stepping, ZUPT stationary filter, Haversine, EMA smoothing
  - src/services/tileCacheService.ts    : IndexedDB map tile cache ("IDR_Tile_Cache_DB", store: "tiles")
  - src/components/MapView.tsx          : Single-init Leaflet map, decoupled camera vs GPS, 60 FPS marker LERP, Follow Mode
  - src/context/NavigationContext.tsx   : Central state (currentLocation, realSensors, routeState, telemetry, matrixScenario)
  - src/pages/RouteSetupPage.tsx        : Multi-vehicle routing, alternatives selection, origin/dest search
  - src/pages/NavigationHudPage.tsx     : Turn-by-turn navigation HUD, live fusion loop, DR kinematic takeover
CORE FEATURES: Real-Time Hardware Sensor Streaming (up to ~100 Hz), Continuous GPS Ingestion, Dead Reckoning in Tunnels/Zero-GNSS, ZUPT Drift Suppression, Multi-Source Heading Fusion, Vehicle-Specific Routing (Car/Bike/Walking), Profile-Aware Route Caching, Decoupled Map Camera & Free Exploration, IndexedDB Offline Map Caching, Auto-Detected 4 Matrix Scenarios, Genuine CSV Telemetry Log Export.
CRITICAL INVARIANTS:
  - Strict No Fake Data in Live Device Mode.
  - GPS fix is primary source of truth; demo coordinates are fallback-only.
  - Decouple GPS marker tracking from map viewport; never force-center an actively explored map.
  - Vehicle selection controls real routing backend; never mix profiles or fall back silently to Car.
  - Coordinate order: Leaflet uses [lat, lng]; OSRM URLs use {lng},{lat}; GeoJSON responses use [lng, lat].
```
