import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigationContext } from '../context/NavigationContext';
import { MobileShell } from '../components/MobileShell';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginUser } = useNavigationContext();

  const [email, setEmail] = useState('alex.mercer@telematics.corp');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPhone, setRememberPhone] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser();
    navigate('/permissions');
  };

  const loginHeader = (
    <div className="w-full h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 -mx-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center text-white">
          <Compass className="w-4 h-4" />
        </div>
        <span className="font-bold text-slate-900 text-base">ReckonX Navigation</span>
      </div>
      <span className="text-xs text-slate-400 font-mono">v2.4</span>
    </div>
  );

  return (
    <MobileShell header={loginHeader} hideHeaderPadding>
      <div className="h-full w-full flex flex-col justify-between bg-slate-50 relative pt-14">
        {/* Main Form Section (Vertically Balanced & Proportional) */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8">
          <div className="text-left">
            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
              Driver & Operator Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Enter your fleet credentials to initialize dead reckoning sensors.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-3.5 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Access PIN / Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 px-3.5 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                id="remember"
                checked={rememberPhone}
                onChange={(e) => setRememberPhone(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer">
                Remember this device
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-md shadow-none flex items-center justify-center cursor-pointer transition-colors"
            >
              Log In & Calibrate Sensors →
            </button>
          </form>
        </div>

        {/* Bottom Docked Footer (Flush to Bottom) */}
        <div className="w-full py-4 bg-transparent border-t border-slate-200/60 flex items-center justify-center shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Local device authentication • Zero telemetry uploaded
          </p>
        </div>
      </div>
    </MobileShell>
  );
};
