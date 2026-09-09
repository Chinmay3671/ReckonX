import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, Route, Activity, Sparkles, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Route', path: '/route-setup', icon: Route },
    { label: 'Telemetry', path: '/telemetry', icon: Activity },
    { label: 'Solution', path: '/solution', icon: Sparkles },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="w-full h-full flex items-center justify-around px-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 h-full flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              isActive ? 'text-blue-700 font-bold' : 'text-slate-500 font-medium hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4 mb-1" />
            <span className="text-[10px] leading-none">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
