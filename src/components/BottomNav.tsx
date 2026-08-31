import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, Route, Activity, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Route Setup', path: '/route-setup', icon: Route },
    { label: 'Telemetry', path: '/telemetry', icon: Activity },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="w-full h-full flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 h-full flex flex-col items-center justify-center py-1 ${
              isActive ? 'text-blue-700 font-bold' : 'text-slate-500 font-medium hover:text-slate-900'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-none">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
