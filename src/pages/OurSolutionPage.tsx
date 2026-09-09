import React from 'react';
import { TopHeader } from '../components/TopHeader';
import { BottomNav } from '../components/BottomNav';
import { MobileShell } from '../components/MobileShell';
import {
  Satellite,
  Activity,
  Layers,
  Compass,
  MapPin,
  Route,
  Navigation,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export const OurSolutionPage: React.FC = () => {
  const header = (
    <TopHeader
      title="Our Solution"
      subtitle="ReckonX Dead Reckoning Architecture"
      backTo="/explore"
    />
  );

  const pipelineSteps = [
    {
      num: '01',
      title: 'GPS / GNSS Baseline Ingestion',
      icon: Satellite,
      badge: 'Client-Side Hardware API',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description:
        'Continuously polls high-accuracy GPS fixes via HTML5 Geolocation API (`navigator.geolocation`) when sky visibility is clear.',
      status: 'Implemented (Real Hardware API)',
    },
    {
      num: '02',
      title: '100 Hz IMU Sensor Stream',
      icon: Activity,
      badge: 'W3C Sensor APIs',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description:
        'Ingests real 3-axis Accelerometer (`devicemotion`) and Gyroscope/Magnetometer (`deviceorientation`) streams directly on the device with iOS WebKit permission integration.',
      status: 'Implemented (Real Hardware API)',
    },
    {
      num: '03',
      title: 'Multi-Source Heading Fusion',
      icon: Compass,
      badge: 'Shortest-Path Filter',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description:
        'Speed-aware angular fusion combining hardware compass, GNSS track bearing, trajectory azimuth, and integrated gyroscope Z-rate with shortest-path angular smoothing to prevent wrap-around spinning.',
      status: 'Implemented (Client Algorithm)',
    },
    {
      num: '04',
      title: 'Dead Reckoning Engine & ZUPT',
      icon: Layers,
      badge: 'Kinematic Stepping',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description:
        'Executes kinematic stepping integration during GNSS signal loss (tunnels/underground). Implements Zero Velocity Update (ZUPT) to suppress integration drift when the vehicle is stationary.',
      status: 'Implemented (Client Algorithm)',
    },
    {
      num: '05',
      title: 'Position Estimation & EMA Filter',
      icon: MapPin,
      badge: 'Exponential Smoothing',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      description:
        'Exponential Moving Average (EMA) and Haversine distance calculations smooth the estimated coordinate trajectory and seamlessly reconcile position upon GNSS signal recovery.',
      status: 'Implemented (Client Algorithm)',
    },
    {
      num: '06',
      title: 'OpenStreetMap & IndexedDB Caching',
      icon: Navigation,
      badge: 'Offline Tile Store',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description:
        'Custom Leaflet tile layer caches real OpenStreetMap tiles in IndexedDB (`IDR_Tile_Cache_DB`) for seamless map rendering in network-deprived corridors.',
      status: 'Implemented (Client Storage)',
    },
    {
      num: '07',
      title: 'Dynamic OSRM Road Routing',
      icon: Route,
      badge: 'OSRM Driving Engine',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      description:
        'Calculates genuine road network turn-by-turn routes via OSRM, with automatic fallback to Haversine straight-line distance when completely offline.',
      status: 'Implemented (Public API + Local Fallback)',
    },
    {
      num: '08',
      title: 'Server-Side Telematics & AI/ML Models',
      icon: Sparkles,
      badge: 'Planned / Backend Integration',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      description:
        'Cloud-based fleet telemetry storage, neural network IMU bias calibration, driver behavior analytics, and multi-vehicle coordination.',
      status: 'Planned / Backend Integration (Contract Ready)',
    },
  ];

  return (
    <MobileShell header={header} footer={<BottomNav />}>
      <div className="h-full flex flex-col justify-between p-4 pb-20">
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Autonomous Navigation Pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              How ReckonX ensures continuous, drift-suppressed vehicle navigation through tunnels,
              underground corridors, and zero-GNSS urban canyons using client-side edge computing.
            </p>
          </div>

          {/* Architecture Pipeline Flow Diagram */}
          <div className="bg-slate-900 text-white rounded-md p-4 space-y-3 font-mono text-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span>SYSTEM DATA FLOW</span>
              <span className="text-emerald-400">EDGE AUTONOMOUS</span>
            </div>
            <div className="text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">1. GPS</span>
                <span className="text-slate-500">→</span>
                <span className="text-amber-400 font-bold">2. IMU Sensors</span>
                <span className="text-slate-500">→</span>
                <span className="text-purple-400 font-bold">3. Heading Fusion</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">↓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">4. Dead Reckoning</span>
                <span className="text-slate-500">→</span>
                <span className="text-teal-400 font-bold">5. Position Fix</span>
                <span className="text-slate-500">→</span>
                <span className="text-sky-400 font-bold">6. OSM / OSRM</span>
              </div>
            </div>
          </div>

          {/* Pipeline Steps List */}
          <div className="space-y-2.5">
            {pipelineSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-white border border-slate-200 rounded-md p-3.5 space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 mr-1.5">
                          {step.num}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{step.title}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pl-9">
                    {step.description}
                  </p>

                  <div className="pt-1.5 pl-9 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold ${step.badgeColor}`}
                    >
                      {step.badge}
                    </span>
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      {step.status.includes('Planned') ? (
                        <ShieldAlert className="w-3 h-3 text-slate-400" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>{step.status}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MobileShell>
  );
};
