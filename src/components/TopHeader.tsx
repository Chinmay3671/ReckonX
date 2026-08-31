import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  backTo,
  showBack = true,
  rightAction,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-1 -ml-1 text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-900" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-bold text-slate-900 truncate leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {rightAction && <div className="flex items-center gap-2 flex-shrink-0">{rightAction}</div>}
    </div>
  );
};
