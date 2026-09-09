import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigationContext } from '../context/NavigationContext';
import { MobileShell } from '../components/MobileShell';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginUser } = useNavigationContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPhone, setRememberPhone] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your work email and password, or click Continue in Local Mode.');
      return;
    }

    // TEMPORARY LOCAL AUTH — replace with backend AuthService when API is available
    loginUser(email.trim());
    navigate('/permissions');
  };

  const handleContinueLocal = () => {
    // TEMPORARY LOCAL AUTH — replace with backend AuthService when API is available
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
      <span className="text-[11px] text-slate-500 font-mono">Local Mode</span>
    </div>
  );

  return (
    <MobileShell header={loginHeader} hideHeaderPadding>
      <div className="h-full w-full flex flex-col justify-between bg-slate-50 relative pt-14">
        <div className="flex-1 flex flex-col justify-center px-6 py-6">
          <div className="text-left">
            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
              Driver & Operator Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Enter your operator credentials or continue in local development mode.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@telematics.corp"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-md text-slate-900 text-xs focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Access PIN / Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter PIN or Password"
                  className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-md text-slate-900 text-xs focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
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

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleContinueLocal}
                className="w-full h-11 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Continue in Local Mode</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Footer */}
        <div className="w-full py-4 bg-transparent border-t border-slate-200/60 flex items-center justify-center shrink-0">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Client-Side Edge Dead Reckoning • Autonomous Navigation Suite
          </p>
        </div>
      </div>
    </MobileShell>
  );
};
